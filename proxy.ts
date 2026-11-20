import { NextResponse, type NextRequest } from "next/server"
import { rotateSession, validateAccessToken } from "@/lib/auth/session"
import {
    ACCESS_TOKEN_COOKIE,
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_COOKIE,
    REFRESH_TOKEN_TTL,
    getCookieOptions,
} from "@/lib/auth/token"

const LOGIN_PATH = "/"
const APP_PATH = "/app"

// Route rules:
// - "/"       → login page, logged-in users are redirected to /app
// - "/app/**" → protected panel, guests are redirected to /
// Expired access tokens are renewed with the refresh token on the way.
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const isLoginPage = pathname === LOGIN_PATH
    const isAppPage = pathname === APP_PATH || pathname.startsWith(`${APP_PATH}/`)

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

    let isAuthenticated = accessToken ? Boolean(await validateAccessToken(accessToken)) : false
    let newTokens: { accessToken: string, refreshToken: string } | null = null

    if (!isAuthenticated && refreshToken) {
        newTokens = await rotateSession(refreshToken)
        isAuthenticated = Boolean(newTokens)
    }

    const hasStaleCookies = !isAuthenticated && Boolean(accessToken || refreshToken)

    let response: NextResponse

    if (isAppPage && !isAuthenticated) {
        response = NextResponse.redirect(new URL(LOGIN_PATH, request.url))
    } else if (isLoginPage && isAuthenticated) {
        response = NextResponse.redirect(new URL(APP_PATH, request.url))
    } else if (newTokens) {
        // Make the new tokens visible to the current request (Server Components / Actions)
        request.cookies.set(ACCESS_TOKEN_COOKIE, newTokens.accessToken)
        request.cookies.set(REFRESH_TOKEN_COOKIE, newTokens.refreshToken)
        response = NextResponse.next({ request: { headers: request.headers } })
    } else {
        response = NextResponse.next()
    }

    if (newTokens) {
        response.cookies.set(ACCESS_TOKEN_COOKIE, newTokens.accessToken, getCookieOptions(ACCESS_TOKEN_TTL))
        response.cookies.set(REFRESH_TOKEN_COOKIE, newTokens.refreshToken, getCookieOptions(REFRESH_TOKEN_TTL))
    }

    if (hasStaleCookies) {
        response.cookies.delete(ACCESS_TOKEN_COOKIE)
        response.cookies.delete(REFRESH_TOKEN_COOKIE)
    }

    return response
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
