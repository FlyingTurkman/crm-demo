// Backs up every collection to backups/<date>/: npm run db:backup
// Documents are saved as MongoDB Extended JSON, so ObjectId and Date types survive the round trip.
// Restore with: npm run db:restore -- backups/<date>
// The backup contains password and token hashes: never commit it (backups/ is in .gitignore).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const batchSize = 1000

type Cursor = {
    id: number | { $numberLong: string }
    firstBatch?: unknown[]
    nextBatch?: unknown[]
}

function isEmptyCursor(id: Cursor['id']) {
    return typeof id === 'number' ? id === 0 : id.$numberLong === '0'
}

async function readCollection(name: string) {
    const first = await prisma.$runCommandRaw({ find: name, batchSize }) as unknown as { cursor: Cursor }
    const documents = [...(first.cursor.firstBatch ?? [])]
    let cursorId = first.cursor.id

    while (!isEmptyCursor(cursorId)) {
        const next = await prisma.$runCommandRaw({
            getMore: typeof cursorId === 'number' ? { $numberLong: String(cursorId) } : cursorId,
            collection: name,
            batchSize,
        }) as unknown as { cursor: Cursor }
        documents.push(...(next.cursor.nextBatch ?? []))
        cursorId = next.cursor.id
    }
    return documents
}

async function main() {
    const list = await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true }) as unknown as {
        cursor: { firstBatch: { name: string, type?: string }[] }
    }
    const names = list.cursor.firstBatch
        .filter(function (collection) {
            return collection.type !== 'view' && !collection.name.startsWith('system.')
        })
        .map(function (collection) {
            return collection.name
        })
        .sort()

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dir = join('backups', stamp)
    mkdirSync(dir, { recursive: true })

    const counts: Record<string, number> = {}
    for (const name of names) {
        const documents = await readCollection(name)
        writeFileSync(join(dir, `${name}.json`), JSON.stringify(documents, null, 2))
        counts[name] = documents.length
        console.log(`${name}: ${documents.length} kayıt`)
    }

    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), counts }, null, 2))
    console.log(`Yedek alındı: ${dir}`)
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
