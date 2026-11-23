// Fills / repairs the searchText field (lib/src/searchText.ts) of every customer, post, note and user:
//   npm run db:search-text
// Needed once after the field was added, after restoring an old backup, or after
// normalizeSearchText changes. Safe to run any time: only outdated records are written,
// and updatedAt isn't touched.
import { PrismaClient } from '@prisma/client'
import { backfillSearchText } from '../searchText.ts'

const prisma = new PrismaClient()

async function main() {
    const fixed = await backfillSearchText(prisma)
    console.log(fixed === 0 ? 'Arama alanları zaten güncel' : `${fixed} kaydın arama alanı güncellendi`)
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
