// Restores a backup made by `npm run db:backup` into the database in DATABASE_URL:
//   npm run db:restore -- backups/<date>
// Only fills empty collections: a collection that already has documents is skipped,
// so running it twice (or against the wrong database) never duplicates or overwrites data.
// Run `npm run db:push` afterwards to create the indexes.
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { backfillSearchText } from '../searchText.ts'

const prisma = new PrismaClient()
const chunkSize = 500

async function countDocuments(name: string) {
    const result = await prisma.$runCommandRaw({ count: name }) as unknown as { n: number }
    return result.n
}

async function main() {
    const dir = process.argv[2]
    if (!dir) {
        throw new Error('Yedek klasörünü verin: npm run db:restore -- backups/<tarih>')
    }

    const files = readdirSync(dir).filter(function (file) {
        return file.endsWith('.json') && file !== 'manifest.json'
    })
    if (files.length === 0) {
        throw new Error(`${dir} içinde yedek dosyası yok`)
    }

    for (const file of files) {
        const name = basename(file, '.json')
        const documents = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Record<string, unknown>[]

        const existing = await countDocuments(name)
        if (existing > 0) {
            console.log(`${name}: atlandı, koleksiyonda zaten ${existing} kayıt var`)
            continue
        }

        for (let start = 0; start < documents.length; start += chunkSize) {
            const chunk = documents.slice(start, start + chunkSize)
            // Extended JSON ($oid, $date) is turned back into ObjectId / Date by the command
            await prisma.$runCommandRaw({ insert: name, documents: chunk } as never)
        }
        console.log(`${name}: ${documents.length} kayıt yüklendi`)
    }

    // Backups made before the searchText field existed (or with an older normalization)
    const fixed = await backfillSearchText(prisma)
    console.log(`Arama alanı güncellenen kayıt: ${fixed}`)

    console.log('Geri yükleme bitti. Index\'ler için şimdi `npm run db:push` çalıştırın.')
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
