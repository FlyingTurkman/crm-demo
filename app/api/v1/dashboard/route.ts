import type { NextRequest } from 'next/server'
import { getDashboardStats } from '@/actions/dashboard'
import { apiResult, getQueryParam, requireApiToken } from '@/lib/api'

type DashboardInput = Parameters<typeof getDashboardStats>[0]

// GET /api/v1/dashboard?date=YYYY-MM-DD&period=today|week|month
export async function GET(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const result = await getDashboardStats({
        date: getQueryParam(request, 'date'),
        period: getQueryParam(request, 'period'),
    } as DashboardInput)
    return apiResult(result)
}
