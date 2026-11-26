// Gives every user without an active REST API token a new random one: npm run api:tokens
// Each new token is printed once (only its hash is stored). Users that already have a token
// keep it (add --force to regenerate all tokens). Demo visitors create theirs on the profile page.
import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { apiTokenPrefix } from '../constants.ts'

const prisma = new PrismaClient()
const force = process.argv.includes('--force')

// Same format and hash as lib/auth/apiToken.ts (that file uses Next.js aliases, so it can't be imported here)
function generateApiToken() {
    return `${apiTokenPrefix}${randomBytes(96).toString('base64url')}`
}

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

async function setToken(userId: string, token: string) {
    await prisma.$transaction([
        prisma.apiToken.updateMany({
            where: { userId, isDeleted: false },
            data: { isDeleted: true },
        }),
        prisma.apiToken.create({
            data: { userId, tokenHash: hashToken(token) },
        }),
    ])
}

async function main() {
    const users = await prisma.user.findMany({
        where: { isDeleted: false },
        select: {
            id: true,
            email: true,
            apiTokens: { where: { isDeleted: false }, select: { tokenHash: true } },
        },
        orderBy: { createdAt: 'asc' },
    })

    for (const user of users) {
        if (user.apiTokens.length > 0 && !force) {
            console.log(`${user.email}: zaten bir token var (yenilemek için --force)`)
            continue
        }

        const token = generateApiToken()
        await setToken(user.id, token)
        console.log(`${user.email}: ${token}`)
    }
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
