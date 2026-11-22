import type { UserRole } from '@prisma/client'

// Every action a user can take. Server Actions check these with authorize(),
// client components use hasPermission() only to hide buttons (never as the real check).
export type Permission =
    | 'customer:read'
    | 'customer:create'
    | 'customer:update'
    | 'customer:delete'
    | 'post:read'
    | 'post:create'
    | 'post:update'
    | 'post:delete'
    | 'note:read'
    | 'note:create'
    | 'note:update'
    | 'note:delete'
    | 'dashboard:read'
    | 'user:read'
    | 'user:create'
    | 'user:update'
    | 'user:delete'
    | 'apiToken:read'
    | 'apiToken:create'
    | 'profile:read'
    | 'profile:update'

const allPermissions: Permission[] = [
    'customer:read',
    'customer:create',
    'customer:update',
    'customer:delete',
    'post:read',
    'post:create',
    'post:update',
    'post:delete',
    'note:read',
    'note:create',
    'note:update',
    'note:delete',
    'dashboard:read',
    'user:read',
    'user:create',
    'user:update',
    'user:delete',
    'apiToken:read',
    'apiToken:create',
    'profile:read',
    'profile:update',
]

// Single source of truth for roles.
// Moderators can do everything except deleting and managing system users and their API tokens (admin panel).
export const rolePermissions: Record<UserRole, Permission[]> = {
    admin: allPermissions,
    moderator: allPermissions.filter(function (permission) {
        return !permission.endsWith(':delete') && !permission.startsWith('user:') && !permission.startsWith('apiToken:')
    }),
}

export function hasPermission(role: UserRole | undefined | null, permission: Permission) {
    // Unknown roles get no permissions instead of throwing
    const permissions = role ? rolePermissions[role] : undefined
    return permissions ? permissions.includes(permission) : false
}
