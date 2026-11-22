import type { NextRequest } from 'next/server'
import { deleteUser, getUser, updateUser } from '@/actions/user'
import { apiResult, invalidBodyError, readJsonBody, requireApiToken } from '@/lib/api'

type Context = { params: Promise<{ userId: string }> }
type UpdateUserInput = Parameters<typeof updateUser>[0]

// GET /api/v1/users/{userId}
export async function GET(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { userId } = await params
    return apiResult(await getUser({ userId }))
}

// PATCH /api/v1/users/{userId}: only the sent fields change, password is optional
export async function PATCH(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    const { userId } = await params
    const current = await getUser({ userId })
    if (!current.user) return apiResult(current)

    const { user } = current
    const result = await updateUser({
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        ...body,
        userId,
    } as UpdateUserInput)
    return apiResult(result)
}

// DELETE /api/v1/users/{userId}: soft delete, its sessions and API token stop working
export async function DELETE(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { userId } = await params
    return apiResult(await deleteUser({ userId }))
}
