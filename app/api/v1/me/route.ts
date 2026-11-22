import { NextResponse, type NextRequest } from 'next/server'
import { getBearerToken, validateApiToken } from '@/lib/auth/apiToken'
import { apiError, requireApiToken } from '@/lib/api'

// GET /api/v1/me: owner of the token (censored UserDto: masked email, password '***')
export async function GET(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const token = getBearerToken(request.headers.get('authorization'))
    const user = token ? await validateApiToken(token) : null
    if (!user) {
        return apiError('Geçersiz API token', 401)
    }
    return NextResponse.json({ status: true, user: { ...user } })
}
