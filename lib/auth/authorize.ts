import type { UserDto } from '@/dtos/userDTO'
import { getCurrentUser } from './session'
import { hasPermission, type Permission } from './permissions'

type AuthorizeResult =
    | { user: UserDto, message?: undefined }
    | { user: null, message: string }

// First line of every Server Action that needs a logged-in user:
//   const auth = await authorize('customer:delete')
//   if (!auth.user) {
//       return { status: false, message: auth.message }
//   }
export async function authorize(permission: Permission): Promise<AuthorizeResult> {
    const user = await getCurrentUser()

    if (!user) {
        return { user: null, message: 'Bu işlem için giriş yapmalısınız' }
    }
    if (!hasPermission(user.role, permission)) {
        return { user: null, message: 'Bu işlem için yetkiniz yok' }
    }
    return { user }
}
