import { prisma } from '@/lib/prisma'
import { UserDto } from '@/dtos/userDTO'
import { generateToken, hashToken } from '@/lib/auth/token'
import { apiTokenPrefix } from '@/lib/src/constants'

// REST API tokens (/api/v1). Like session tokens they are opaque random tokens
// (no JWT) and only their SHA-256 hash is stored. Each user has one active token.

// 'crm_' + 128 character base64url token
export function generateApiToken() {
    return `${apiTokenPrefix}${generateToken()}`
}

// 'Bearer <token>' -> '<token>', anything else -> null
export function getBearerToken(authorization: string | null) {
    if (!authorization) return null

    const [scheme, token] = authorization.trim().split(/\s+/)
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null

    return token
}

// Validates a raw API token and returns its owner as a censored UserDto, or null.
export async function validateApiToken(token: string) {
    const apiToken = await prisma.apiToken.findFirst({
        where: {
            tokenHash: hashToken(token),
            isDeleted: false,
            user: { isDeleted: false },
        },
        select: {
            id: true,
            user: { omit: { password: true } },
        },
    })

    if (!apiToken) return null

    await prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsedAt: new Date() },
    })

    return new UserDto(apiToken.user)
}

// Gives the user a new token (or the given one, used for the fixed demo tokens).
// The old token stops working immediately. Returns the raw token: it is shown once, never stored.
export async function issueApiToken(userId: string, token: string = generateApiToken()) {
    await prisma.$transaction([
        prisma.apiToken.updateMany({
            where: { userId, isDeleted: false },
            data: { isDeleted: true },
        }),
        prisma.apiToken.create({
            data: { userId, tokenHash: hashToken(token) },
        }),
    ])
    return token
}
