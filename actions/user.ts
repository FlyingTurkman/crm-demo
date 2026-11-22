'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, UserRole } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { paginate } from '@/lib/pagination'
import { authorize } from '@/lib/auth/authorize'
import { issueApiToken } from '@/lib/auth/apiToken'
import { hashPassword } from '@/lib/auth/password'
import { getPeriodWhere } from '@/lib/period'
import { escapeRegex } from '@/lib/search'
import { ManagedUserDto } from '@/dtos/userDTO'
import {
    createdPeriods,
    maxNameLength,
    maxPasswordLength,
    maxSearchLength,
    minPasswordLength,
    objectIdPattern,
    pageLimit,
    searchResultLimit,
    sidebarUserLimit,
    userSorts,
} from '@/lib/src/constants'
import type { Response } from '@/types'

// System users (login accounts) for the admin panel. Every action needs a `user:*`
// permission (admins only). The password hash is never read: queries use `omit`.

const userIdField = z.string().regex(objectIdPattern, 'Geçersiz kullanıcı')
const roleField = z.enum(UserRole, 'Geçersiz rol')

const userFields = {
    name: z
        .string()
        .trim()
        .min(1, 'Ad zorunludur')
        .max(maxNameLength, `Ad en fazla ${maxNameLength} karakter olabilir`),
    surname: z
        .string()
        .trim()
        .min(1, 'Soyad zorunludur')
        .max(maxNameLength, `Soyad en fazla ${maxNameLength} karakter olabilir`),
    email: z.email('Geçerli bir email girin'),
    role: roleField,
}

const passwordField = z
    .string()
    .min(minPasswordLength, `Şifre en az ${minPasswordLength} karakter uzunluğunda olmalıdır`)
    .max(maxPasswordLength, `Şifre en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`)

const getUsersSchema = z.object({
    query: z
        .string()
        .trim()
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`)
        .optional(),
    role: roleField.optional(),
    period: z.enum(createdPeriods, 'Geçersiz tarih aralığı').optional(),
    sort: z.enum(userSorts, 'Geçersiz sıralama').default('updated'),
    page: z.coerce.number().int().min(1, 'Geçersiz sayfa').default(1),
})

const searchUsersSchema = z.object({
    query: z
        .string()
        .trim()
        .min(1, 'Arama metni boş olamaz')
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`),
})

const getUserSchema = z.object({
    userId: userIdField,
})

const createUserSchema = z.object({
    ...userFields,
    password: passwordField,
})

const updateUserSchema = z.object({
    userId: userIdField,
    ...userFields,
    // Empty = keep the current password
    password: z.union([z.literal(''), passwordField]).optional(),
})

type UserSort = (typeof userSorts)[number]

type GetUsersResponse = Response & {
    users?: ManagedUserDto[]
    total?: number
    page?: number
    pageCount?: number
}

type GetRecentUsersResponse = Response & {
    users?: ManagedUserDto[]
}

type SearchUsersResponse = Response & {
    users?: ManagedUserDto[]
}

type GetUserResponse = Response & {
    user?: ManagedUserDto
}

type CreateUserResponse = Response & {
    user?: ManagedUserDto
    // Raw REST API token of the new user, shown to the admin once
    apiToken?: string
    href?: string
}

type UpdateUserResponse = Response & {
    user?: ManagedUserDto
    href?: string
}

type DeleteUserResponse = Response & {
    href?: string
}

const userOrderBy: Record<UserSort, Prisma.UserOrderByWithRelationInput> = {
    updated: { updatedAt: 'desc' },
    created: { createdAt: 'desc' },
    name: { fullName: 'asc' },
}

function getUserSearchWhere(query: string | undefined): Prisma.UserWhereInput {
    const search = query ? escapeRegex(query) : ''
    if (!search) {
        return {}
    }
    return {
        OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ],
    }
}

// Class instances can't cross to client components: spread the censored DTO
function toManagedUser(user: Omit<Prisma.UserGetPayload<object>, 'password'>) {
    return { ...new ManagedUserDto(user) }
}

function revalidateAdmin() {
    revalidatePath('/app/admin', 'layout')
}

export async function getUsers(input: z.input<typeof getUsersSchema>): Promise<GetUsersResponse> {
    const auth = await authorize('user:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getUsersSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { query, role, period, sort, page } = parsed.data
    const where: Prisma.UserWhereInput = {
        isDeleted: false,
        ...getUserSearchWhere(query),
        ...(role ? { role } : {}),
        ...getPeriodWhere(period),
    }

    const result = await paginate(page, function () {
        return prisma.user.count({ where })
    }, function (skip) {
        return prisma.user.findMany({
            where,
            omit: { password: true },
            orderBy: userOrderBy[sort],
            skip,
            take: pageLimit,
        })
    })
    const users = result.items
    return { status: true, users: users.map((user) => toManagedUser(user)), total: result.total, page: result.page, pageCount: result.pageCount }
}

export async function getRecentUsers(): Promise<GetRecentUsersResponse> {
    const auth = await authorize('user:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const users = await prisma.user.findMany({
        where: { isDeleted: false },
        omit: { password: true },
        orderBy: { updatedAt: 'desc' },
        take: sidebarUserLimit,
    })
    return { status: true, users: users.map((user) => toManagedUser(user)) }
}

export async function searchUsers(input: z.input<typeof searchUsersSchema>): Promise<SearchUsersResponse> {
    const auth = await authorize('user:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = searchUsersSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const users = await prisma.user.findMany({
        where: { isDeleted: false, ...getUserSearchWhere(parsed.data.query) },
        omit: { password: true },
        orderBy: { updatedAt: 'desc' },
        take: searchResultLimit,
    })
    return { status: true, users: users.map((user) => toManagedUser(user)) }
}

export async function getUser(input: z.input<typeof getUserSchema>): Promise<GetUserResponse> {
    const auth = await authorize('user:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getUserSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const user = await prisma.user.findFirst({
        where: { id: parsed.data.userId, isDeleted: false },
        omit: { password: true },
    })
    if (!user) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }
    return { status: true, user: toManagedUser(user) }
}

export async function createUser(input: z.input<typeof createUserSchema>): Promise<CreateUserResponse> {
    const auth = await authorize('user:create')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = createUserSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { name, surname, email, role, password } = parsed.data

    try {
        const user = await prisma.user.create({
            data: {
                name,
                surname,
                fullName: `${name} ${surname}`,
                email,
                role,
                password: await hashPassword(password),
            },
            omit: { password: true },
        })
        // Every user gets an API token right away
        const apiToken = await issueApiToken(user.id)
        revalidateAdmin()
        return { status: true, message: 'Kullanıcı oluşturuldu', user: toManagedUser(user), apiToken, href: '/app/admin' }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { status: false, message: 'Bu email ile kayıtlı bir kullanıcı zaten var' }
        }
        throw error
    }
}

export async function updateUser(input: z.input<typeof updateUserSchema>): Promise<UpdateUserResponse> {
    const auth = await authorize('user:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updateUserSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { userId, name, surname, email, role, password } = parsed.data
    const isSelf = userId === auth.user.id

    // An admin removing their own admin role would lock themselves out of the panel
    if (isSelf && role !== 'admin') {
        return { status: false, message: 'Kendi admin rolünüzü kaldıramazsınız' }
    }

    const existing = await prisma.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { id: true },
    })
    if (!existing) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                surname,
                fullName: `${name} ${surname}`,
                email,
                role,
                ...(password ? { password: await hashPassword(password) } : {}),
            },
            omit: { password: true },
        })

        // A password reset by an admin logs the user out everywhere
        if (password && !isSelf) {
            await prisma.session.updateMany({
                where: { userId, isDeleted: false },
                data: { isDeleted: true },
            })
        }

        revalidateAdmin()
        return { status: true, message: 'Kullanıcı güncellendi', user: toManagedUser(user), href: '/app/admin' }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { status: false, message: 'Bu email ile kayıtlı başka bir kullanıcı var' }
        }
        throw error
    }
}

export async function deleteUser(input: z.input<typeof getUserSchema>): Promise<DeleteUserResponse> {
    const auth = await authorize('user:delete')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getUserSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { userId } = parsed.data
    if (userId === auth.user.id) {
        return { status: false, message: 'Kendi hesabınızı silemezsiniz' }
    }

    const existing = await prisma.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { id: true },
    })
    if (!existing) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }

    // Soft delete the user together with its sessions and API tokens, so it is locked out immediately
    await prisma.$transaction([
        prisma.session.updateMany({ where: { userId, isDeleted: false }, data: { isDeleted: true } }),
        prisma.apiToken.updateMany({ where: { userId, isDeleted: false }, data: { isDeleted: true } }),
        prisma.user.update({ where: { id: userId }, data: { isDeleted: true } }),
    ])

    revalidateAdmin()
    return { status: true, message: 'Kullanıcı silindi', href: '/app/admin' }
}
