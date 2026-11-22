import type { NextRequest } from 'next/server'
import { getAllNotes } from '@/actions/note'
import { apiResult, getQueryParam, requireApiToken } from '@/lib/api'

type GetAllNotesInput = Parameters<typeof getAllNotes>[0]

// GET /api/v1/notes?q=&period=&sort=&page=  (notes of all customers)
// New notes are created under their customer: POST /api/v1/customers/{customerId}/notes
export async function GET(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const result = await getAllNotes({
        query: getQueryParam(request, 'q'),
        period: getQueryParam(request, 'period'),
        sort: getQueryParam(request, 'sort'),
        page: getQueryParam(request, 'page'),
    } as GetAllNotesInput)
    return apiResult(result)
}
