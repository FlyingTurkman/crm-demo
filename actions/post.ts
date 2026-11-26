'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { PostPlatform, PostStatus, PostType, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { paginate } from '@/lib/pagination'
import { authorize } from '@/lib/auth/authorize'
import { sanitizeRichTextHtml } from '@/lib/richText'
import {
    addDays,
    getDueWhere,
    getPeriodWhere,
    parseDateTimeValue,
    toDateTimeValue,
    parseDayValue,
    type CreatedPeriod,
    type PostDueFilter,
} from '@/lib/period'
import { getSearchWhere } from '@/lib/search'
import { normalizeSearchText } from '@/lib/src/searchText'
import { detectImageType, getImageUrl } from '@/lib/images'
import { headObject, putObject } from '@/lib/s3'
import { PublicUserDto } from '@/dtos/userDTO'
import {
    agendaDays,
    createdPeriods,
    maxImageNameLength,
    maxPostContentLength,
    maxPostImages,
    maxPostImageSize,
    maxPostImageSizeMb,
    maxPostTitleLength,
    maxRawContentLength,
    maxSearchLength,
    objectIdPattern,
    pageLimit,
    postAssigneeFilters,
    postDueFilters,
    postImageKeyPattern,
    postImageTypes,
    postSorts,
    searchResultLimit,
    sidebarPostLimit,
} from '@/lib/src/constants'
import type { Post, PostImage, Response } from '@/types'

const customerIdField = z.string().regex(objectIdPattern, 'Geçersiz müşteri')
const postIdField = z.string().regex(objectIdPattern, 'Geçersiz içerik')
const statusField = z.enum(PostStatus, 'Geçersiz durum')
const typeField = z.enum(PostType, 'Geçersiz içerik türü')
const platformField = z.enum(PostPlatform, 'Geçersiz kanal')

const postFields = {
    title: z
        .string()
        .trim()
        .min(1, 'Başlık zorunludur')
        .max(maxPostTitleLength, `Başlık en fazla ${maxPostTitleLength} karakter olabilir`),
    status: statusField,
    type: typeField,
    // Channels the post is produced for; duplicates are dropped
    platforms: z
        .array(platformField, 'Geçersiz kanallar')
        .transform(function (platforms) {
            return Array.from(new Set(platforms))
        }),
    // Delivery day as YYYY-MM-DD, '' clears it
    dueDate: z
        .string()
        .refine(function (value) {
            return value === '' || parseDayValue(value) !== null
        }, 'Geçersiz teslim tarihi')
        .transform(function (value) {
            return value === '' ? null : parseDayValue(value)
        }),
    // Planned publish time as YYYY-MM-DDTHH:mm, '' clears it
    scheduledAt: z
        .string()
        .refine(function (value) {
            return value === '' || parseDateTimeValue(value) !== null
        }, 'Geçersiz yayın zamanı')
        .transform(function (value) {
            return value === '' ? null : parseDateTimeValue(value)
        }),
    // Responsible system user, '' clears it
    assigneeId: z
        .string()
        .refine(function (value) {
            return value === '' || objectIdPattern.test(value)
        }, 'Geçersiz sorumlu')
        .transform(function (value) {
            return value === '' ? null : value
        }),
    // Images uploaded with uploadPostImage, in display order
    images: z
        .array(z.object({
            key: z.string().regex(postImageKeyPattern, 'Geçersiz görsel'),
            name: z.string().trim().min(1, 'Görsel adı zorunludur').max(maxImageNameLength, 'Görsel adı çok uzun'),
        }), 'Geçersiz görseller')
        .max(maxPostImages, `En fazla ${maxPostImages} görsel eklenebilir`),
    // Plain text output of the editor (serializeToPlainText)
    content: z
        .string()
        .refine(function (value) {
            return value.trim().length > 0
        }, 'İçerik zorunludur')
        .refine(function (value) {
            return value.length <= maxPostContentLength
        }, `İçerik en fazla ${maxPostContentLength} karakter olabilir`),
    // HTML output of the editor (serializeToHtml), sanitized before saving
    rawContent: z
        .string()
        .max(maxRawContentLength, 'İçerik çok büyük'),
}

// Search, filter, sort and page of post lists
const postListFields = {
    query: z
        .string()
        .trim()
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`)
        .optional(),
    status: statusField.optional(),
    type: typeField.optional(),
    platform: platformField.optional(),
    due: z.enum(postDueFilters, 'Geçersiz teslim filtresi').optional(),
    assignee: z.enum(postAssigneeFilters, 'Geçersiz sorumlu filtresi').optional(),
    period: z.enum(createdPeriods, 'Geçersiz tarih aralığı').optional(),
    sort: z.enum(postSorts, 'Geçersiz sıralama').default('updated'),
    page: z.coerce.number().int().min(1, 'Geçersiz sayfa').default(1),
}

const getPostsSchema = z.object({
    customerId: customerIdField,
    ...postListFields,
})

const getAllPostsSchema = z.object(postListFields)

type PostSort = (typeof postSorts)[number]

const postOrderBy: Record<PostSort, Prisma.PostOrderByWithRelationInput> = {
    updated: { updatedAt: 'desc' },
    created: { createdAt: 'desc' },
    title: { title: 'asc' },
}

type PostListFilters = {
    query?: string
    status?: PostStatus
    type?: PostType
    platform?: PostPlatform
    due?: PostDueFilter
    assignee?: (typeof postAssigneeFilters)[number]
    period?: CreatedPeriod
}

// Assignee filter of lists and the agenda: 'me' (the logged-in user), 'none' (unassigned) or a user id
function getAssigneeWhere(assignee: string | undefined, userId: string): Prisma.PostWhereInput {
    if (assignee === 'me') return { assigneeId: userId }
    if (assignee === 'none') return { assigneeId: null }
    if (assignee) return { assigneeId: assignee }
    return {}
}

function getPostListWhere(filters: PostListFilters, userId: string): Prisma.PostWhereInput {
    const assigneeWhere = getAssigneeWhere(filters.assignee, userId)

    return {
        isDeleted: false,
        customer: { isDeleted: false },
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.platform ? { platforms: { has: filters.platform } } : {}),
        ...getDueWhere(filters.due),
        ...assigneeWhere,
        ...getPeriodWhere(filters.period),
        // Title and plain text content (Turkish-insensitive, see lib/src/searchText.ts)
        ...getSearchWhere(filters.query),
    }
}

// The responsible user is a User record: only its public fields leave the server
const assigneeInclude = {
    assignee: { omit: { password: true } },
} satisfies Prisma.PostInclude

type PostWithAssignee = Prisma.PostGetPayload<{ include: typeof assigneeInclude }>

function toPost<T extends PostWithAssignee>(post: T) {
    const assignee = post.assignee && !post.assignee.isDeleted ? { ...new PublicUserDto(post.assignee) } : null
    return { ...post, assignee }
}

const searchPostsSchema = z.object({
    query: z
        .string()
        .trim()
        .min(1, 'Arama metni boş olamaz')
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`),
})

const getPostSchema = z.object({
    postId: postIdField,
})

const createPostSchema = z.object({
    customerId: customerIdField,
    ...postFields,
})

const updatePostSchema = z.object({
    postId: postIdField,
    ...postFields,
})

const updatePostStatusSchema = z.object({
    postId: postIdField,
    status: statusField,
})

const uploadPostImageSchema = z.object({
    file: z
        .instanceof(File, { message: 'Görsel seçin' })
        .refine(function (file) {
            return file.size > 0
        }, 'Görsel boş')
        .refine(function (file) {
            return file.size <= maxPostImageSize
        }, `Görsel en fazla ${maxPostImageSizeMb} MB olabilir`),
})

type GetPostsResponse = Response & {
    posts?: Post[]
    total?: number
    page?: number
    pageCount?: number
}

type GetAllPostsResponse = Response & {
    posts?: Post[]
    total?: number
    page?: number
    pageCount?: number
}

type GetRecentPostsResponse = Response & {
    posts?: Post[]
}

type SearchPostsResponse = Response & {
    posts?: Post[]
}

type GetPostResponse = Response & {
    post?: Post
}

type CreatePostResponse = Response & {
    post?: Post
    href?: string
}

type UpdatePostResponse = Response & {
    post?: Post
    href?: string
}

type UpdatePostStatusResponse = Response & {
    post?: Post
}

type DeletePostResponse = Response & {
    href?: string
}

type GetPostAssigneesResponse = Response & {
    users?: PublicUserDto[]
}

const getAgendaSchema = z.object({
    // First day of the week shown (YYYY-MM-DD), today by default
    date: z
        .string()
        .refine(function (value) {
            return parseDayValue(value) !== null
        }, 'Geçersiz tarih')
        .optional(),
    // Whose work: 'me', 'none' (unassigned) or a user id; everyone when left out
    assignee: z
        .string()
        .refine(function (value) {
            return value === 'me' || value === 'none' || objectIdPattern.test(value)
        }, 'Geçersiz sorumlu')
        .optional(),
})

type GetAgendaResponse = Response & {
    // First day of the shown week (YYYY-MM-DD, Türkiye time)
    start?: string
    // Posts with a publish time in the week, and posts due in it
    scheduledPosts?: Post[]
    duePosts?: Post[]
    // True when a list hit pageLimit and some posts aren't shown
    isTruncated?: boolean
    // The user picked in the assignee filter (to show its name), when filtering by a user id
    assigneeUser?: PublicUserDto | null
}

type SearchPostAssigneesResponse = Response & {
    users?: PublicUserDto[]
}

type UploadPostImageResponse = Response & {
    image?: PostImage
    url?: string
}

export async function getPosts(input: z.input<typeof getPostsSchema>): Promise<GetPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getPostsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId, sort, page, ...filters } = parsed.data
    const where: Prisma.PostWhereInput = {
        ...getPostListWhere(filters, auth.user.id),
        customerId,
    }

    const result = await paginate(page, function () {
        return prisma.post.count({ where })
    }, function (skip) {
        return prisma.post.findMany({
            where,
            orderBy: postOrderBy[sort],
            skip,
            take: pageLimit,
            include: assigneeInclude,
        })
    })
    const posts = result.items.map((post) => toPost(post))
    return { status: true, posts, total: result.total, page: result.page, pageCount: result.pageCount }
}

// Posts of all customers, for /app/blogs
export async function getAllPosts(input: z.input<typeof getAllPostsSchema>): Promise<GetAllPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getAllPostsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { sort, page, ...filters } = parsed.data
    const where = getPostListWhere(filters, auth.user.id)

    const result = await paginate(page, function () {
        return prisma.post.count({ where })
    }, function (skip) {
        return prisma.post.findMany({
            where,
            orderBy: postOrderBy[sort],
            skip,
            take: pageLimit,
            include: { customer: true, ...assigneeInclude },
        })
    })
    const posts = result.items.map((post) => toPost(post))
    return { status: true, posts, total: result.total, page: result.page, pageCount: result.pageCount }
}

export async function getRecentPosts(): Promise<GetRecentPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const posts = await prisma.post.findMany({
        where: { isDeleted: false, customer: { isDeleted: false } },
        orderBy: { updatedAt: 'desc' },
        take: sidebarPostLimit,
        include: { customer: true },
    })
    return { status: true, posts }
}

export async function searchPosts(input: z.input<typeof searchPostsSchema>): Promise<SearchPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = searchPostsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const posts = await prisma.post.findMany({
        where: {
            isDeleted: false,
            customer: { isDeleted: false },
            ...getSearchWhere(parsed.data.query),
        },
        orderBy: { updatedAt: 'desc' },
        take: searchResultLimit,
        include: { customer: true },
    })
    return { status: true, posts }
}

export async function getPost(input: z.input<typeof getPostSchema>): Promise<GetPostResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getPostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const post = await prisma.post.findFirst({
        where: { id: parsed.data.postId, isDeleted: false, customer: { isDeleted: false } },
        include: assigneeInclude,
    })
    if (!post) {
        return { status: false, message: 'İçerik bulunamadı' }
    }
    return { status: true, post: toPost(post) }
}

// The agenda (/app/agenda): a week of posts by publish time (scheduledAt) plus the posts due in it
export async function getAgenda(input: z.input<typeof getAgendaSchema>): Promise<GetAgendaResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getAgendaSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    // Week boundaries at Türkiye midnight (not the server's: Vercel runs in UTC), like the publish times
    const startDay = parsed.data.date ?? toDateTimeValue(new Date()).slice(0, 10)
    const start = parseDateTimeValue(`${startDay}T00:00`) as Date
    const end = new Date(start.getTime() + agendaDays * 24 * 60 * 60 * 1000)
    // Delivery days are stored at the server's midnight: compare them by day
    const dueStart = parseDayValue(startDay) as Date
    const dueEnd = addDays(dueStart, agendaDays)
    const base: Prisma.PostWhereInput = {
        isDeleted: false,
        customer: { isDeleted: false },
        ...getAssigneeWhere(parsed.data.assignee, auth.user.id),
    }
    const include = { customer: true, ...assigneeInclude }

    const assigneeId = parsed.data.assignee && objectIdPattern.test(parsed.data.assignee) ? parsed.data.assignee : null

    const [scheduledPosts, duePosts, assigneeUser] = await Promise.all([
        prisma.post.findMany({
            // gte + lt never match null (see getOverdueWhere for the lt-only case)
            where: { ...base, scheduledAt: { gte: start, lt: end } },
            orderBy: { scheduledAt: 'asc' },
            take: pageLimit,
            include,
        }),
        prisma.post.findMany({
            where: { ...base, dueDate: { gte: dueStart, lt: dueEnd } },
            orderBy: { dueDate: 'asc' },
            take: pageLimit,
            include,
        }),
        assigneeId
            ? prisma.user.findFirst({ where: { id: assigneeId, isDeleted: false }, omit: { password: true } })
            : Promise.resolve(null),
    ])

    return {
        status: true,
        start: startDay,
        scheduledPosts: scheduledPosts.map((post) => toPost(post)),
        duePosts: duePosts.map((post) => toPost(post)),
        isTruncated: scheduledPosts.length === pageLimit || duePosts.length === pageLimit,
        assigneeUser: assigneeUser ? { ...new PublicUserDto(assigneeUser) } : null,
    }
}

// Search of the users a post can be assigned to (agenda's assignee filter). Public fields only,
// so moderators can use it too (the admin panel's user search needs user:read).
export async function searchPostAssignees(input: z.input<typeof searchPostsSchema>): Promise<SearchPostAssigneesResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = searchPostsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    // A user's searchText also holds the email: matches are narrowed to the name, otherwise a
    // moderator could find out whose an email address is by searching for it
    const query = normalizeSearchText(parsed.data.query)
    const candidates = await prisma.user.findMany({
        where: { isDeleted: false, ...getSearchWhere(parsed.data.query) },
        omit: { password: true },
        orderBy: { fullName: 'asc' },
        take: pageLimit,
    })
    const users = candidates
        .filter(function (user) {
            return normalizeSearchText(user.fullName).includes(query)
        })
        .slice(0, searchResultLimit)
    return { status: true, users: users.map((user) => ({ ...new PublicUserDto(user) })) }
}

// System users a post can be assigned to (public fields only, both roles can read them)
export async function getPostAssignees(): Promise<GetPostAssigneesResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const users = await prisma.user.findMany({
        where: { isDeleted: false },
        omit: { password: true },
        orderBy: { fullName: 'asc' },
        take: pageLimit,
    })
    return { status: true, users: users.map((user) => ({ ...new PublicUserDto(user) })) }
}

// Uploads one image to S3 and returns its key. The post stores it only when the form is saved.
// The file goes through the server (no presigned URL), so its real type is checked from its bytes
// and the bucket needs no CORS rules.
export async function uploadPostImage(formData: FormData): Promise<UploadPostImageResponse> {
    const auth = await authorize('post:create')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = uploadPostImageSchema.safeParse({ file: formData.get('file') })
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { file } = parsed.data
    const bytes = new Uint8Array(await file.arrayBuffer())
    const contentType = detectImageType(bytes)
    if (!contentType) {
        return { status: false, message: 'Yalnızca JPG, PNG, WEBP veya GIF görseller yüklenebilir' }
    }

    const key = `posts/${randomUUID()}.${postImageTypes[contentType]}`
    try {
        await putObject(key, bytes, contentType)
    } catch (error) {
        console.error('S3 upload failed', error)
        return { status: false, message: 'Görsel yüklenemedi, lütfen tekrar deneyin' }
    }

    const name = (file.name || 'gorsel').slice(0, maxImageNameLength)
    const image = { key, name, contentType, size: bytes.length }
    return { status: true, message: 'Görsel yüklendi', image, url: getImageUrl(key) }
}

type ImageInput = { key: string, name: string }

// Turns the form's image list into stored images. Images already on the post keep their data,
// new keys must exist in S3 (uploaded with uploadPostImage): their size and type come from S3,
// not from the client.
async function resolveImages(images: ImageInput[], current: PostImage[]): Promise<PostImage[] | null> {
    const unique = images.filter(function (image, index) {
        return images.findIndex(function (other) {
            return other.key === image.key
        }) === index
    })

    const resolved = await Promise.all(unique.map(async (image) => {
        const existing = current.find(function (item) {
            return item.key === image.key
        })
        if (existing) {
            return { ...existing, name: image.name }
        }

        const object = await headObject(image.key)
        if (!object || !(object.contentType in postImageTypes)) {
            return null
        }
        return { key: image.key, name: image.name, contentType: object.contentType, size: object.size }
    }))

    const isValid = resolved.every(function (image) {
        return image !== null
    })
    return isValid ? resolved as PostImage[] : null
}

async function assigneeExists(assigneeId: string | null) {
    if (!assigneeId) {
        return true
    }
    const user = await prisma.user.findFirst({
        where: { id: assigneeId, isDeleted: false },
        select: { id: true },
    })
    return Boolean(user)
}

export async function createPost(input: z.input<typeof createPostSchema>): Promise<CreatePostResponse> {
    const auth = await authorize('post:create')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = createPostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId, title, status, type, platforms, dueDate, scheduledAt, assigneeId, content, rawContent } = parsed.data

    const customer = await prisma.customer.findFirst({
        where: { id: customerId, isDeleted: false },
        select: { id: true },
    })
    if (!customer) {
        return { status: false, message: 'Müşteri bulunamadı' }
    }
    if (!await assigneeExists(assigneeId)) {
        return { status: false, message: 'Sorumlu kullanıcı bulunamadı' }
    }
    const images = await resolveImages(parsed.data.images, [])
    if (!images) {
        return { status: false, message: 'Görsellerden biri bulunamadı, lütfen tekrar yükleyin' }
    }

    const post = await prisma.post.create({
        data: {
            customerId,
            title,
            status,
            type,
            platforms,
            dueDate,
            scheduledAt,
            assigneeId,
            images,
            content,
            rawContent: sanitizeRichTextHtml(rawContent),
        },
        include: assigneeInclude,
    })

    // 'layout' also refreshes the post counts in the customer header and sidebar
    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    revalidatePath('/app')
    revalidatePath('/app/agenda')
    return { status: true, message: 'İçerik oluşturuldu', post: toPost(post), href: `/app/customers/${customerId}/blogs/${post.id}` }
}

export async function updatePost(input: z.input<typeof updatePostSchema>): Promise<UpdatePostResponse> {
    const auth = await authorize('post:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updatePostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { postId, title, status, type, platforms, dueDate, scheduledAt, assigneeId, content, rawContent } = parsed.data

    const existing = await prisma.post.findFirst({
        where: { id: postId, isDeleted: false, customer: { isDeleted: false } },
        select: { id: true, images: true },
    })
    if (!existing) {
        return { status: false, message: 'İçerik bulunamadı' }
    }
    if (!await assigneeExists(assigneeId)) {
        return { status: false, message: 'Sorumlu kullanıcı bulunamadı' }
    }
    const images = await resolveImages(parsed.data.images, existing.images)
    if (!images) {
        return { status: false, message: 'Görsellerden biri bulunamadı, lütfen tekrar yükleyin' }
    }

    const post = await prisma.post.update({
        where: { id: postId },
        data: {
            title,
            status,
            type,
            platforms,
            dueDate,
            scheduledAt,
            assigneeId,
            images,
            content,
            rawContent: sanitizeRichTextHtml(rawContent),
        },
        include: assigneeInclude,
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    revalidatePath('/app')
    revalidatePath('/app/agenda')
    return { status: true, message: 'İçerik güncellendi', post: toPost(post), href: `/app/customers/${post.customerId}/blogs/${post.id}` }
}

export async function updatePostStatus(input: z.input<typeof updatePostStatusSchema>): Promise<UpdatePostStatusResponse> {
    const auth = await authorize('post:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updatePostStatusSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { postId, status } = parsed.data

    const existing = await prisma.post.findFirst({
        where: { id: postId, isDeleted: false, customer: { isDeleted: false } },
        select: { id: true },
    })
    if (!existing) {
        return { status: false, message: 'İçerik bulunamadı' }
    }

    const post = await prisma.post.update({
        where: { id: postId },
        data: { status },
        include: assigneeInclude,
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    revalidatePath('/app')
    revalidatePath('/app/agenda')
    return { status: true, message: 'İçerik durumu güncellendi', post: toPost(post) }
}

export async function deletePost(input: z.input<typeof getPostSchema>): Promise<DeletePostResponse> {
    const auth = await authorize('post:delete')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getPostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const existing = await prisma.post.findFirst({
        where: { id: parsed.data.postId, isDeleted: false },
        select: { id: true, customerId: true },
    })
    if (!existing) {
        return { status: false, message: 'İçerik bulunamadı' }
    }

    // Soft delete only (its images stay in S3 too)
    await prisma.post.update({
        where: { id: existing.id },
        data: { isDeleted: true },
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    revalidatePath('/app')
    revalidatePath('/app/agenda')
    return { status: true, message: 'İçerik silindi', href: `/app/customers/${existing.customerId}/blogs` }
}
