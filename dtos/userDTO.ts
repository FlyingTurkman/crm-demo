import type { User } from '@/types'

// Shown instead of the password. The hash itself is never copied.
export const PASSWORD_MASK = '***'

// 'test@testmail.com' -> 't***@testmail.com'
export function maskEmail(email: string): string {
    const [local, domain] = email.split('@')

    if (!local || !domain) return PASSWORD_MASK

    return `${local[0]}***@${domain}`
}

// Account data of a user. Relations (sessions) and internal fields (isDeleted)
// are never copied. Email is masked and password is always '***'.
export class UserDto {
    id: string
    name: string
    surname: string
    fullName: string
    email: string
    password: string
    role: User['role']
    createdAt: Date
    updatedAt: Date

    constructor(data: Omit<User, 'password'>) {
        this.id = data.id
        this.name = data.name
        this.surname = data.surname
        this.fullName = data.fullName
        this.email = maskEmail(data.email)
        this.password = PASSWORD_MASK
        this.role = data.role
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
    }
}

// A user as an admin sees it in the admin panel (only returned by `user:*` actions).
// Email is NOT masked so it can be edited; the password / hash is never copied.
export class ManagedUserDto {
    id: string
    name: string
    surname: string
    fullName: string
    email: string
    role: User['role']
    createdAt: Date
    updatedAt: Date

    constructor(data: Omit<User, 'password'>) {
        this.id = data.id
        this.name = data.name
        this.surname = data.surname
        this.fullName = data.fullName
        this.email = data.email
        this.role = data.role
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
    }
}

// Public data of a user, safe to show to other users.
// No email, password, role or relations.
export class PublicUserDto {
    id: string
    name: string
    surname: string
    fullName: string
    createdAt: Date

    constructor(data: Omit<User, 'password'>) {
        this.id = data.id
        this.name = data.name
        this.surname = data.surname
        this.fullName = data.fullName
        this.createdAt = data.createdAt
    }
}
