// Gives every post without channels one to three random social media platforms: npm run db:platforms-demo
// With --all every post gets new ones (npm run db:platforms-demo -- --all). Website / e-mail / other
// are left out on purpose: those are picked by hand for the posts they fit.
// Raw writes: updatedAt and searchText don't change.
import { PrismaClient, type PostPlatform } from '@prisma/client'

const prisma = new PrismaClient()
const reassignAll = process.argv.includes('--all')

const socialPlatforms: PostPlatform[] = ['instagram', 'tiktok', 'facebook', 'x', 'linkedin', 'youtube', 'pinterest']

// One to three different platforms, in the order of the list above
function randomPlatforms() {
    const count = 1 + Math.floor(Math.random() * 3)
    const picked = new Set<PostPlatform>()
    while (picked.size < count) {
        picked.add(socialPlatforms[Math.floor(Math.random() * socialPlatforms.length)])
    }
    return socialPlatforms.filter(function (platform) {
        return picked.has(platform)
    })
}

async function main() {
    const posts = await prisma.post.findMany({
        where: reassignAll ? { isDeleted: false } : { isDeleted: false, platforms: { isEmpty: true } },
        select: { id: true },
    })
    if (posts.length === 0) {
        console.log('Platformu boş içerik yok (hepsini yenilemek için: -- --all)')
        return
    }

    const updates = posts.map((post) => ({ postId: post.id, platforms: randomPlatforms() }))
    await prisma.$runCommandRaw({
        update: 'posts',
        updates: updates.map((update) => ({
            q: { _id: { $oid: update.postId } },
            u: { $set: { platforms: update.platforms } },
        })),
    })

    console.log(`${posts.length} içeriğe sosyal medya platformu eklendi:`)
    socialPlatforms.forEach(function (platform) {
        const count = updates.filter(function (update) {
            return update.platforms.includes(platform)
        }).length
        console.log(`  ${platform}: ${count}`)
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
