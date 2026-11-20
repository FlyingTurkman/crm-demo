import { createHash, randomBytes } from "crypto"

export const ACCESS_TOKEN_COOKIE = "access_token"
export const REFRESH_TOKEN_COOKIE = "refresh_token"

// Lifetimes in seconds
export const ACCESS_TOKEN_TTL = 60 * 15
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30

// 96 random bytes -> 128 character URL-safe opaque token (not a JWT)
const TOKEN_BYTES = 96

export function generateToken() {
    return randomBytes(TOKEN_BYTES).toString("base64url")
}

// Only the SHA-256 hash of a token is stored in the database,
// so a leaked database cannot be used to hijack sessions.
export function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex")
}

export function getCookieOptions(maxAge: number) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge,
    }
}
