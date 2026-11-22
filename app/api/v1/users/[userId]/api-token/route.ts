import type { NextRequest } from 'next/server'
import { getApiTokenInfo, regenerateApiToken } from '@/actions/apiToken'
import { apiResult, requireApiToken } from '@/lib/api'

type Context = { params: Promise<{ userId: string }> }

// GET /api/v1/users/{userId}/api-token: when the token was created and last used (never the token)
export async function GET(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { userId } = await params
    return apiResult(await getApiTokenInfo({ userId }))
}

// POST /api/v1/users/{userId}/api-token: new token, the old one stops working at once
export async function POST(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { userId } = await params
    return apiResult(await regenerateApiToken({ userId }), 201)
}
