import { cache } from 'react'
import { headers } from 'next/headers'
import type { UserDto } from '@/dtos/userDTO'
import { getBearerToken, validateApiToken } from './apiToken'
import { getCurrentUser } from './session'
import { hasPermission, type Permission } from './permissions'

// Also used by the REST API to turn these messages into 401 / 403
export const loginRequiredMessage = 'Bu işlem için giriş yapmalısınız'
export const forbiddenMessage = 'Bu işlem için yetkiniz yok'

type AuthorizeResult =
    | { user: UserDto, message?: undefined }
    | { user: null, message: string }

// The caller of this request: an 'Authorization: Bearer <api token>' header (REST API)
// wins over the session cookie (panel). A header with an invalid token is never
// silently replaced by the cookie. Memoized per request like getCurrentUser().
const getRequestUser = cache(async function () {
    const headerStore = await headers()
    const authorization = headerStore.get('authorization')

    if (authorization) {
        const token = getBearerToken(authorization)
        return token ? validateApiToken(token) : null
    }
    return getCurrentUser()
})

// First line of every Server Action that needs a logged-in user:
//   const auth = await authorize('customer:delete')
//   if (!auth.user) {
//       return { status: false, message: auth.message }
//   }
// The REST API (app/api/v1) calls the same actions, so it is checked the same way.
export async function authorize(permission: Permission): Promise<AuthorizeResult> {
    const user = await getRequestUser()

    if (!user) {
        return { user: null, message: loginRequiredMessage }
    }
    if (!hasPermission(user.role, permission)) {
        return { user: null, message: forbiddenMessage }
    }
    return { user }
}
