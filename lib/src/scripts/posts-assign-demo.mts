// Gives every post without an assignee a responsible user: npm run db:assign-demo
// With --all every post is reassigned (e.g. after adding team members: npm run db:assign-demo -- --all).
// Active users take turns (shuffled posts, round-robin users), so the work is spread evenly and
// the agenda's assignee filter has something to show.
// Raw writes: updatedAt and searchText don't change. Without --all it only fills empty ones.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const reassignAll = process.argv.includes('--all')

function shuffle<T>(items: T[]) {
    const copy = [...items]
    for (let index = copy.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1))
        const item = copy[index]
        copy[index] = copy[other]
        copy[other] = item
    }
    return copy
}

async function main() {
    const [users, posts] = await Promise.all([
        prisma.user.findMany({
            where: { isDeleted: false },
            select: { id: true, fullName: true },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.post.findMany({
            where: reassignAll ? { isDeleted: false } : { isDeleted: false, assigneeId: null },
            select: { id: true },
        }),
    ])

    if (users.length === 0) {
        console.log('Aktif kullanıcı yok, önce npm run user:create ile kullanıcı oluşturun')
        return
    }
    if (posts.length === 0) {
        console.log('Sorumlusu olmayan içerik yok')
        return
    }

    const assignments = shuffle(posts).map((post, index) => ({ postId: post.id, user: users[index % users.length] }))
    await prisma.$runCommandRaw({
        update: 'posts',
        updates: assignments.map((assignment) => ({
            q: { _id: { $oid: assignment.postId } },
            u: { $set: { assigneeId: { $oid: assignment.user.id } } },
        })),
    })

    console.log(`${posts.length} içeriğe sorumlu atandı:`)
    users.forEach(function (user) {
        const count = assignments.filter(function (assignment) {
            return assignment.user.id === user.id
        }).length
        console.log(`  ${user.fullName}: ${count}`)
    })
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
