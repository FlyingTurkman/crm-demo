import type { NextRequest } from 'next/server'
import { createUser, getUsers } from '@/actions/user'
import { apiResult, getQueryParam, invalidBodyError, readJsonBody, requireApiToken } from '@/lib/api'

type GetUsersInput = Parameters<typeof getUsers>[0]
type CreateUserInput = Parameters<typeof createUser>[0]

// System users, admins only (user:* permissions)

// GET /api/v1/users?q=&role=&period=&sort=&page=
export async function GET(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const result = await getUsers({
        query: getQueryParam(request, 'q'),
        role: getQueryParam(request, 'role'),
        period: getQueryParam(request, 'period'),
        sort: getQueryParam(request, 'sort'),
        page: getQueryParam(request, 'page'),
    } as GetUsersInput)
    return apiResult(result)
}

// POST /api/v1/users  { name, surname, email, role, password }
// The response has the new user's API token, it is shown only this once.
export async function POST(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    return apiResult(await createUser(body as CreateUserInput), 201)
}
