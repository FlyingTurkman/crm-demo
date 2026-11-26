import type { NextRequest } from 'next/server'
import { getAgenda } from '@/actions/post'
import { apiResult, getQueryParam, requireApiToken } from '@/lib/api'

type GetAgendaInput = Parameters<typeof getAgenda>[0]

// GET /api/v1/agenda?date=YYYY-MM-DD&assignee=me|none|<userId>  (7 days from date: posts by publish time + posts due)
export async function GET(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const result = await getAgenda({
        date: getQueryParam(request, 'date'),
        assignee: getQueryParam(request, 'assignee'),
    } as GetAgendaInput)
    return apiResult(result)
}
