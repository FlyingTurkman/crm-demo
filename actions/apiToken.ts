'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorize'
import { issueApiToken } from '@/lib/auth/apiToken'
import { objectIdPattern } from '@/lib/src/constants'
import type { Response } from '@/types'

// REST API tokens of system users, managed from the admin panel (admins only).
// Only the hash is stored, so a token can be seen once: when it is generated.

const apiTokenSchema = z.object({
    userId: z.string().regex(objectIdPattern, 'Geçersiz kullanıcı'),
})

export type ApiTokenInfo = {
    createdAt: Date
    lastUsedAt: Date | null
}

type GetApiTokenInfoResponse = Response & {
    apiToken?: ApiTokenInfo | null
}

type RegenerateApiTokenResponse = Response & {
    // Raw token, shown to the admin once
    token?: string
    apiToken?: ApiTokenInfo
}

export async function getApiTokenInfo(input: z.input<typeof apiTokenSchema>): Promise<GetApiTokenInfoResponse> {
    const auth = await authorize('apiToken:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = apiTokenSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const apiToken = await prisma.apiToken.findFirst({
        where: { userId: parsed.data.userId, isDeleted: false, user: { isDeleted: false } },
        select: { createdAt: true, lastUsedAt: true },
        orderBy: { createdAt: 'desc' },
    })
    return { status: true, apiToken }
}

export async function regenerateApiToken(input: z.input<typeof apiTokenSchema>): Promise<RegenerateApiTokenResponse> {
    const auth = await authorize('apiToken:create')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = apiTokenSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { userId } = parsed.data
    const user = await prisma.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { id: true },
    })
    if (!user) {
        return { status: false, message: 'Kullanıcı bulunamadı' }
    }

    const token = await issueApiToken(userId)

    revalidatePath('/app/admin', 'layout')
    return {
        status: true,
        message: 'Yeni API token oluşturuldu, eskisi artık çalışmaz',
        token,
        apiToken: { createdAt: new Date(), lastUsedAt: null },
    }
}
