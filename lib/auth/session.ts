import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import {
    ACCESS_TOKEN_COOKIE,
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_COOKIE,
    REFRESH_TOKEN_TTL,
    generateToken,
    getCookieOptions,
    hashToken,
} from "@/lib/auth/token"

function getExpiryDates() {
    const now = Date.now()
    return {
        accessTokenExpiresAt: new Date(now + ACCESS_TOKEN_TTL * 1000),
        refreshTokenExpiresAt: new Date(now + REFRESH_TOKEN_TTL * 1000),
    }
}

// Creates a session for the user and writes both tokens to httpOnly cookies.
// Usable in Server Actions only (cookies can't be set while rendering).
export async function createSession(userId: string) {
    const accessToken = generateToken()
    const refreshToken = generateToken()

    await prisma.session.create({
        data: {
            userId,
            accessTokenHash: hashToken(accessToken),
            refreshTokenHash: hashToken(refreshToken),
            ...getExpiryDates(),
        },
    })

    const cookieStore = await cookies()
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, getCookieOptions(ACCESS_TOKEN_TTL))
    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, getCookieOptions(REFRESH_TOKEN_TTL))
}

// Validates a raw access token against the database.
// Returns the full session user with the password hash cleared (password: ''), or null if the token is invalid or expired.
export async function validateAccessToken(accessToken: string) {
    const session = await prisma.session.findFirst({
        where: {
            accessTokenHash: hashToken(accessToken),
            accessTokenExpiresAt: { gt: new Date() },
            isDeleted: false,
            user: { isDeleted: false },
        },
        select: { user: true },
    })

    if (!session) return null

    // The password hash never leaves the server
    return { ...session.user, password: '' }
}

// Validates the access token cookie and returns the logged-in user (password cleared), or null.
export async function getCurrentUser() {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
    if (!accessToken) return null

    return validateAccessToken(accessToken)
}

// Exchanges a valid refresh token for a brand new token pair (rotation).
// The old tokens stop working immediately. Returns null if the refresh token is invalid.
export async function rotateSession(refreshToken: string) {
    const session = await prisma.session.findFirst({
        where: {
            refreshTokenHash: hashToken(refreshToken),
            refreshTokenExpiresAt: { gt: new Date() },
            isDeleted: false,
            user: { isDeleted: false },
        },
        select: { id: true },
    })
    if (!session) return null

    const newAccessToken = generateToken()
    const newRefreshToken = generateToken()

    await prisma.session.update({
        where: { id: session.id },
        data: {
            accessTokenHash: hashToken(newAccessToken),
            refreshTokenHash: hashToken(newRefreshToken),
            ...getExpiryDates(),
        },
    })

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

// Soft-deletes the current session and clears the cookies.
export async function deleteSession() {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

    if (refreshToken) {
        await prisma.session.updateMany({
            where: { refreshTokenHash: hashToken(refreshToken), isDeleted: false },
            data: { isDeleted: true },
        })
    }

    cookieStore.delete(ACCESS_TOKEN_COOKIE)
    cookieStore.delete(REFRESH_TOKEN_COOKIE)
}
