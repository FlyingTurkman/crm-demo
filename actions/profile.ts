'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorize'
import { issueApiToken } from '@/lib/auth/apiToken'
import { isDemoAccountEmail } from '@/lib/auth/demo'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { getCurrentSessionId } from '@/lib/auth/session'
import { maxNameLength, maxPasswordLength, minPasswordLength } from '@/lib/src/constants'
import { UserDto } from '@/dtos/userDTO'
import type { ApiTokenInfo } from '@/actions/apiToken'
import type { Response } from '@/types'

// The logged-in user's own account (/app/profile). Every action works on auth.user.id only,
// so a user can never change someone else's account from here.

const demoLockedMessage = 'Demo hesabında şifre, API token ve oturumlar değiştirilemez'

const updateProfileSchema = z.object({
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
})

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Mevcut şifrenizi girin').max(maxPasswordLength, 'Mevcut şifre hatalı'),
    newPassword: z
        .string()
        .min(minPasswordLength, `Yeni şifre en az ${minPasswordLength} karakter uzunluğunda olmalıdır`)
        .max(maxPasswordLength, `Yeni şifre en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`),
})

export type Profile = {
    user: UserDto
    // Password and API token are locked on the published demo accounts
    isDemo: boolean
    apiToken: ApiTokenInfo | null
    // Active sessions on other devices / browsers
    otherSessionCount: number
}

type GetProfileResponse = Response & {
    profile?: Profile
}

type UpdateProfileResponse = Response & {
    user?: UserDto
}

type ChangePasswordResponse = Response & {
    // Other sessions that were logged out
    closedSessionCount?: number
}

type LogoutOtherSessionsResponse = Response & {
    closedSessionCount?: number
}

type RegenerateMyApiTokenResponse = Response & {
    // Raw token, shown once
    token?: string
    apiToken?: ApiTokenInfo
}

// Active sessions of the user except the one making the request
async function getOtherSessionsWhere(userId: string) {
    const currentSessionId = await getCurrentSessionId()
    return {
        userId,
        isDeleted: false,
        refreshTokenExpiresAt: { gt: new Date() },
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
    }
}

export async function getProfile(): Promise<GetProfileResponse> {
    const auth = await authorize('profile:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const userId = auth.user.id
    const user = await prisma.user.findFirst({
        where: { id: userId, isDeleted: false },
        omit: { password: true },
    })
    if (!user) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }

    const [apiToken, otherSessionCount] = await Promise.all([
        prisma.apiToken.findFirst({
            where: { userId, isDeleted: false },
            select: { createdAt: true, lastUsedAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.session.count({ where: await getOtherSessionsWhere(userId) }),
    ])

    return {
        status: true,
        profile: {
            user: { ...new UserDto(user) },
            isDemo: isDemoAccountEmail(user.email),
            apiToken,
            otherSessionCount,
        },
    }
}

export async function updateProfile(input: z.input<typeof updateProfileSchema>): Promise<UpdateProfileResponse> {
    const auth = await authorize('profile:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updateProfileSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { name, surname } = parsed.data
    const user = await prisma.user.update({
        where: { id: auth.user.id },
        data: { name, surname, fullName: `${name} ${surname}` },
        omit: { password: true },
    })

    // The name is shown in the menu and the admin panel
    revalidatePath('/app', 'layout')
    return { status: true, message: 'Profil bilgileriniz güncellendi', user: { ...new UserDto(user) } }
}

export async function changePassword(input: z.input<typeof changePasswordSchema>): Promise<ChangePasswordResponse> {
    const auth = await authorize('profile:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = changePasswordSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const userId = auth.user.id
    // The only place besides login where the hash is read: to verify the current password
    const user = await prisma.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { email: true, password: true },
    })
    if (!user) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }
    if (isDemoAccountEmail(user.email)) {
        return { status: false, message: demoLockedMessage }
    }

    const { currentPassword, newPassword } = parsed.data
    if (!(await verifyPassword(user.password, currentPassword))) {
        return { status: false, message: 'Mevcut şifre hatalı' }
    }
    if (currentPassword === newPassword) {
        return { status: false, message: 'Yeni şifre mevcut şifreyle aynı olamaz' }
    }

    const otherSessionsWhere = await getOtherSessionsWhere(userId)
    // New password + log out every other device, this session stays logged in
    const [, closed] = await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { password: await hashPassword(newPassword) },
            select: { id: true },
        }),
        prisma.session.updateMany({
            where: otherSessionsWhere,
            data: { isDeleted: true },
        }),
    ])

    return { status: true, message: 'Şifreniz değiştirildi, diğer oturumlar kapatıldı', closedSessionCount: closed.count }
}

export async function logoutOtherSessions(): Promise<LogoutOtherSessionsResponse> {
    const auth = await authorize('profile:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const user = await prisma.user.findFirst({
        where: { id: auth.user.id, isDeleted: false },
        select: { email: true },
    })
    if (!user) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }
    // Everyone shares the demo accounts: one visitor must not log the others out
    if (isDemoAccountEmail(user.email)) {
        return { status: false, message: demoLockedMessage }
    }

    const closed = await prisma.session.updateMany({
        where: await getOtherSessionsWhere(auth.user.id),
        data: { isDeleted: true },
    })

    return { status: true, message: 'Diğer oturumlar kapatıldı', closedSessionCount: closed.count }
}

export async function regenerateMyApiToken(): Promise<RegenerateMyApiTokenResponse> {
    const auth = await authorize('profile:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const user = await prisma.user.findFirst({
        where: { id: auth.user.id, isDeleted: false },
        select: { id: true, email: true },
    })
    if (!user) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }
    if (isDemoAccountEmail(user.email)) {
        return { status: false, message: demoLockedMessage }
    }

    const token = await issueApiToken(user.id)

    revalidatePath('/app/profile')
    revalidatePath('/app/admin', 'layout')
    return {
        status: true,
        message: 'Yeni API token oluşturuldu, eskisi artık çalışmaz',
        token,
        apiToken: { createdAt: new Date(), lastUsedAt: null },
    }
}
