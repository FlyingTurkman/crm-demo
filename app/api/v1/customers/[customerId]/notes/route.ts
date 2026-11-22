import type { NextRequest } from 'next/server'
import { createNote, getNotes } from '@/actions/note'
import { apiResult, getQueryParam, invalidBodyError, readJsonBody, requireApiToken, withRichText } from '@/lib/api'

type Context = { params: Promise<{ customerId: string }> }
type GetNotesInput = Parameters<typeof getNotes>[0]
type CreateNoteInput = Parameters<typeof createNote>[0]

// GET /api/v1/customers/{customerId}/notes?q=&sort=&page=
export async function GET(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { customerId } = await params
    const result = await getNotes({
        customerId,
        query: getQueryParam(request, 'q'),
        sort: getQueryParam(request, 'sort'),
        page: getQueryParam(request, 'page'),
    } as GetNotesInput)
    return apiResult(result)
}

// POST /api/v1/customers/{customerId}/notes  { rawContent and / or content }
export async function POST(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    const { customerId } = await params
    const result = await createNote({
        ...withRichText(body),
        customerId,
    } as CreateNoteInput)
    return apiResult(result, 201)
}
