// Creates the demo agency team (demoTeamMembers in constants.ts) as moderators: npm run db:team-demo
// Members that already exist are left as they are. Each new member gets a random password (stored
// only as an argon2 hash, never printed: an admin can reset it in the admin panel) and an API token
// (only its hash is stored, like every user). Then run `npm run db:assign-demo -- --all` to spread
// the posts over the whole team.
import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import { apiTokenPrefix, demoTeamMembers } from '../constants.ts'
import { searchTextExtension } from '../searchText.ts'

// The extension fills the users' searchText, like the app's client does
const prisma = new PrismaClient().$extends(searchTextExtension)

async function main() {
    let created = 0
    for (const member of demoTeamMembers) {
        const existing = await prisma.user.findFirst({ where: { email: member.email }, select: { id: true } })
        if (existing) {
            console.log(`${member.name} ${member.surname}: zaten var`)
            continue
        }

        const user = await prisma.user.create({
            data: {
                name: member.name,
                surname: member.surname,
                fullName: `${member.name} ${member.surname}`,
                email: member.email,
                role: 'moderator',
                password: await argon2.hash(randomBytes(32).toString('base64url'), { type: argon2.argon2id }),
            },
        })
        // Every user has an API token (same format as lib/auth/apiToken.ts); it is never shown
        const apiToken = `${apiTokenPrefix}${randomBytes(96).toString('base64url')}`
        await prisma.apiToken.create({
            data: { userId: user.id, tokenHash: createHash('sha256').update(apiToken).digest('hex') },
        })
        created++
        console.log(`${user.fullName}: oluşturuldu (moderatör)`)
    }
    console.log(created === 0 ? 'Ekip zaten tam' : `${created} ekip üyesi eklendi`)
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
