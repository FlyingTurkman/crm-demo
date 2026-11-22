import { NextResponse, type NextRequest } from 'next/server'
import { getBearerToken } from '@/lib/auth/apiToken'
import { forbiddenMessage, loginRequiredMessage } from '@/lib/auth/authorize'
import { richTextHtmlToPlainText } from '@/lib/richText'
import type { Response } from '@/types'

// Helpers of the REST API (app/api/v1). The routes call the same Server Actions as the
// panel, so validation (zod), permissions (authorize), soft delete and revalidation
// are shared. These helpers only translate between HTTP and the actions.

export type JsonBody = Record<string, unknown>

type ActionResult = Response & {
    href?: string
}

export function apiError(message: string, status: number) {
    const headers: HeadersInit = status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}
    return NextResponse.json({ status: false, message }, { status, headers })
}

// The API only accepts 'Authorization: Bearer <api token>', never the panel's session cookie
export function requireApiToken(request: NextRequest) {
    const token = getBearerToken(request.headers.get('authorization'))
    if (!token) {
        return apiError('API token gerekli: Authorization: Bearer <token>', 401)
    }
    return null
}

// Status code of a failed action, from its (Turkish) message
function getErrorStatus(message: string | undefined) {
    if (message === loginRequiredMessage) return 401
    if (message === forbiddenMessage) return 403
    if (message && /bulunamadı$/.test(message)) return 404
    if (message && /(zaten var|başka bir .* var)$/.test(message)) return 409
    return 400
}

// Action result -> JSON response. `href` is a panel route, so it is left out.
export function apiResult(result: ActionResult, successStatus = 200) {
    if (!result.status) {
        return apiError(result.message ?? 'İstek işlenemedi', getErrorStatus(result.message))
    }
    const body: ActionResult = { ...result }
    delete body.href
    return NextResponse.json(body, { status: successStatus })
}

// JSON object body or null. A null value clears an optional field (sent to the actions as '').
export async function readJsonBody(request: NextRequest): Promise<JsonBody | null> {
    try {
        const body: unknown = await request.json()
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return null
        }
        const entries = Object.entries(body).map(([key, value]) => [key, value === null ? '' : value])
        return Object.fromEntries(entries)
    } catch {
        return null
    }
}

export function invalidBodyError() {
    return apiError('İstek gövdesi geçerli bir JSON nesnesi olmalıdır', 400)
}

// Query string value, empty values count as missing
export function getQueryParam(request: NextRequest, name: string) {
    const value = request.nextUrl.searchParams.get(name)
    return value ? value : undefined
}

function escapeHtml(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// Rich text models store `content` (plain text) and `rawContent` (HTML). API clients may send
// only one of them, the other one is derived (rawContent is still sanitized by the action).
export function withRichText(body: JsonBody): JsonBody {
    const hasContent = typeof body.content === 'string'
    const hasRawContent = typeof body.rawContent === 'string'

    if (hasRawContent && !hasContent) {
        return { ...body, content: richTextHtmlToPlainText(body.rawContent as string) }
    }
    if (hasContent && !hasRawContent) {
        // One <div> per line, like the editor's serializeToHtml
        const lines = (body.content as string).split('\n')
        const rawContent = lines.map((line) => `<div>${line ? escapeHtml(line) : '<br>'}</div>`).join('')
        return { ...body, rawContent }
    }
    return body
}
