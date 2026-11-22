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
//
// To keep every request fast, /app/** is only checked optimistically here (is there an access
// token cookie?). The real check against the database is done once per request by
// getCurrentUser() / authorize() in the layouts and Server Actions; a revoked session there
// redirects to "/", where this proxy validates the cookies fully and clears them.
// The database is only touched here when:
// - the access token cookie is gone (it expires with the token) but a refresh token exists → rotation
// - on the login page, so a revoked session can't bounce between "/" and "/app"
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const isLoginPage = pathname === LOGIN_PATH
    const isAppPage = pathname === APP_PATH || pathname.startsWith(`${APP_PATH}/`)

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

    let isAuthenticated = false
    if (accessToken) {
        isAuthenticated = isLoginPage ? Boolean(await validateAccessToken(accessToken)) : true
    }

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

// The REST API (/api) authenticates with Bearer tokens, not cookies, so it skips the proxy
export const config = {
    matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
