// Gives posts saved before the type / platforms / due date / schedule / assignee / images fields their defaults:
//   npm run db:posts-backfill
// Prisma can't read a document without a required field (type), and `dueDate: null` /
// `assigneeId: null` filters don't match missing fields, so they are written as null.
// Safe to run any time: only documents missing a field are written, updatedAt isn't touched.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaults: Record<string, unknown> = {
    type: 'blog',
    dueDate: null,
    scheduledAt: null,
    assigneeId: null,
    images: [],
    platforms: [],
}

async function main() {
    // Raw command: no Prisma middleware, so neither updatedAt nor searchText change
    const result = await prisma.$runCommandRaw({
        update: 'posts',
        updates: Object.entries(defaults).map(([field, value]) => ({
            q: { [field]: { $exists: false } },
            u: { $set: { [field]: value } },
            multi: true,
        })),
    } as Parameters<typeof prisma.$runCommandRaw>[0]) as { nModified?: number }

    const modified = result.nModified ?? 0
    console.log(modified === 0 ? 'İçerikler zaten güncel' : `${modified} alan güncellendi`)
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
