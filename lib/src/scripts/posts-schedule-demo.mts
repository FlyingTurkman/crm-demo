// Gives part of the posts a future publish time so the agenda (/app/agenda) has something to show:
//   npm run db:schedule-demo
// Only posts that aren't published and have no publish time yet are touched: about half of them
// get a working-hours slot (09:00–18:00, on the half hour) in the next 14 days, weekends skipped.
// Raw writes: updatedAt and searchText don't change. Running it again schedules more of the rest.
import { PrismaClient } from '@prisma/client'
import { scheduleStepMinutes } from '../constants.ts'

const prisma = new PrismaClient()
const share = 0.5
const days = 14
const firstHour = 9
const lastHour = 18

function between(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min + 1))
}

// A working day in the next `days` days, at a random step between firstHour and lastHour
function randomSlot() {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    do {
        date.setDate(date.getDate() + 1)
    } while (date.getDay() === 0 || date.getDay() === 6)
    date.setDate(date.getDate() + between(0, days - 1))
    // Landed on a weekend: move to Monday
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1)
    }
    const steps = ((lastHour - firstHour) * 60) / scheduleStepMinutes
    date.setMinutes(firstHour * 60 + between(0, steps) * scheduleStepMinutes)
    return date
}

async function main() {
    const posts = await prisma.post.findMany({
        where: { isDeleted: false, customer: { isDeleted: false }, status: { not: 'published' }, scheduledAt: null },
        select: { id: true },
    })
    const picked = posts.filter(function () {
        return Math.random() < share
    })
    if (picked.length === 0) {
        console.log('Zamanlanacak içerik yok')
        return
    }

    await prisma.$runCommandRaw({
        update: 'posts',
        updates: picked.map((post) => ({
            q: { _id: { $oid: post.id } },
            u: { $set: { scheduledAt: { $date: randomSlot().toISOString() } } },
        })),
    })
    console.log(`${picked.length} içeriğe önümüzdeki ${days} gün için yayın zamanı verildi`)
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
