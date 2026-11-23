import { Prisma, type PrismaClient } from '@prisma/client'

// Turkish-friendly search. MongoDB's case-insensitive regex doesn't know Turkish casing
// ('ŞAHİN' doesn't find 'Şahin', 'IŞIK' doesn't find 'ışık') and can't match text typed
// without Turkish characters ('gunes' -> 'güneş'). So every searchable model stores a
// normalized copy of its searchable fields in `searchText`, and queries are normalized the
// same way before they are matched against it.
//
// `searchText` is maintained ONLY by searchTextExtension below: every create / update of a
// searchable model goes through it, so the field can't go stale. Never write it by hand.
// Used by lib/prisma.ts and the CLI scripts (which import this file with the .ts extension).

// 'ŞAHİN' / 'Şahin' / 'sahin' -> 'sahin', 'IŞIK' / 'ışık' -> 'isik', 'Çatı' -> 'cati'
export function normalizeSearchText(text: string) {
    return text
        // Turkish casing first: 'İ' -> 'i', 'I' -> 'ı'
        .toLocaleLowerCase('tr-TR')
        // Split letters from their marks (ç, ğ, ö, ş, ü, â, ...) and drop the marks
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        // 'ı' has no mark to drop
        .replace(/ı/g, 'i')
        .replace(/\s+/g, ' ')
        .trim()
}

// Fields copied into searchText, per model
const searchFields = {
    customer: ['fullName', 'email', 'phone', 'company'],
    post: ['title', 'content'],
    note: ['content'],
    user: ['fullName', 'email'],
} as const

export type SearchModel = keyof typeof searchFields

// Collection of each model (@@map), for raw updates that must not touch updatedAt
const collections: Record<SearchModel, string> = {
    customer: 'customers',
    post: 'posts',
    note: 'notes',
    user: 'users',
}

// Fields are normalized one by one and joined with a line break: a normalized query never
// contains one, so a search can't match across two fields
export function buildSearchText(model: SearchModel, record: Record<string, unknown>) {
    return searchFields[model]
        .map((field) => record[field])
        .filter(function (value): value is string {
            return typeof value === 'string' && value.length > 0
        })
        .map((value) => normalizeSearchText(value))
        .join('\n')
}

function getSearchModel(model: string | undefined): SearchModel | null {
    const key = model ? model.charAt(0).toLowerCase() + model.slice(1) : ''
    return key in searchFields ? key as SearchModel : null
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

// Does this create / update data change a searchable field?
function touchesSearchFields(model: SearchModel, data: Record<string, unknown>) {
    return searchFields[model].some(function (field) {
        return field in data
    })
}

// Does it set every searchable field to a plain value (so searchText can be built from it)?
function hasAllSearchFields(model: SearchModel, data: Record<string, unknown>) {
    return searchFields[model].every(function (field) {
        const value = data[field]
        return value === undefined ? false : value === null || typeof value === 'string'
    })
}

type SearchDelegate = {
    findUnique: (args: object) => Promise<Record<string, unknown> | null>
    update: (args: object) => Promise<unknown>
}

function getDelegate(client: PrismaClient, model: SearchModel) {
    return (client as unknown as Record<SearchModel, SearchDelegate>)[model]
}

// After a partial update (e.g. only the name of a user changed) the other searchable fields
// are read back, so searchText is always built from the complete, saved record
async function rebuildSearchText(client: PrismaClient, model: SearchModel, id: unknown) {
    if (typeof id !== 'string') {
        return
    }
    const select = Object.fromEntries(searchFields[model].map((field) => [field, true]))
    const record = await getDelegate(client, model).findUnique({ where: { id }, select })
    if (record) {
        await getDelegate(client, model).update({ where: { id }, data: { searchText: buildSearchText(model, record) } })
    }
}

export const searchTextExtension = Prisma.defineExtension(function (client) {
    const baseClient = client as unknown as PrismaClient

    return client.$extends({
        name: 'searchText',
        query: {
            $allModels: {
                async create({ model, args, query }) {
                    const searchModel = getSearchModel(model)
                    if (searchModel) {
                        const data = asRecord(args.data)
                        data.searchText = buildSearchText(searchModel, data)
                    }
                    return query(args)
                },
                async createMany({ model, args, query }) {
                    const searchModel = getSearchModel(model)
                    if (searchModel) {
                        const rows = Array.isArray(args.data) ? args.data : [args.data]
                        rows.forEach(function (row) {
                            const data = asRecord(row)
                            data.searchText = buildSearchText(searchModel, data)
                        })
                    }
                    return query(args)
                },
                async update({ model, args, query }) {
                    const searchModel = getSearchModel(model)
                    const data = asRecord(args.data)
                    if (!searchModel || !touchesSearchFields(searchModel, data)) {
                        return query(args)
                    }
                    // Usual case: the action sends every searchable field, no extra query needed
                    if (hasAllSearchFields(searchModel, data)) {
                        data.searchText = buildSearchText(searchModel, data)
                        return query(args)
                    }
                    const result = await query(args)
                    await rebuildSearchText(baseClient, searchModel, asRecord(result).id ?? asRecord(args.where).id)
                    return result
                },
                async upsert({ model, args, query }) {
                    const searchModel = getSearchModel(model)
                    if (!searchModel) {
                        return query(args)
                    }
                    const result = await query(args)
                    await rebuildSearchText(baseClient, searchModel, asRecord(result).id ?? asRecord(args.where).id)
                    return result
                },
                async updateMany({ model, args, query }) {
                    const searchModel = getSearchModel(model)
                    // Rebuilding many records one by one would be slow and easy to forget:
                    // bulk updates may only touch other fields (isDeleted, status, ...)
                    if (searchModel && touchesSearchFields(searchModel, asRecord(args.data))) {
                        throw new Error(`${model}.updateMany aranabilir alanları değiştiremez, update kullanın`)
                    }
                    return query(args)
                },
            },
        },
    })
})

// Fills searchText of every record that is missing it or has an outdated one (records written
// before the field existed, a restored backup, a changed normalizeSearchText). Uses raw updates
// so updatedAt (the 'recently updated' lists) doesn't change. Returns the number of fixed records.
export async function backfillSearchText(client: PrismaClient) {
    const batchSize = 500
    let fixed = 0

    for (const model of Object.keys(searchFields) as SearchModel[]) {
        const select = Object.fromEntries([...searchFields[model], 'id', 'searchText'].map((field) => [field, true]))
        let cursor: string | undefined

        while (true) {
            const records = await (getDelegate(client, model) as unknown as {
                findMany: (args: object) => Promise<Record<string, unknown>[]>
            }).findMany({
                select,
                orderBy: { id: 'asc' },
                take: batchSize,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            })
            if (records.length === 0) {
                break
            }
            cursor = String(records[records.length - 1].id)

            const updates = records
                .map((record) => ({ record, searchText: buildSearchText(model, record) }))
                .filter(function (item) {
                    return item.record.searchText !== item.searchText
                })
                .map((item) => ({
                    q: { _id: { $oid: String(item.record.id) } },
                    u: { $set: { searchText: item.searchText } },
                }))
            if (updates.length > 0) {
                await client.$runCommandRaw({ update: collections[model], updates } as never)
                fixed += updates.length
            }
        }
    }
    return fixed
}
