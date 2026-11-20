'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { createSession, deleteSession } from '@/lib/auth/session'
import { maxPasswordLength, minPasswordLength } from '@/lib/src/constants'
import type { Response, User } from '@/types'

const loginSchema = z.object({
    email: z.email('Geçerli bir email girin'),
    password: z
        .string()
        .min(minPasswordLength, `Şifreniz en az ${minPasswordLength} karakter uzunluğunda olmalıdır`)
        .max(maxPasswordLength, `Şifreniz en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`),
})

type LoginResponse = Response & {
    href?: string
    user?: User
}

type LogoutResponse = Response & {
    href?: string
}

export async function login(input: z.input<typeof loginSchema>): Promise<LoginResponse> {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const user = await prisma.user.findFirst({
        where: { email: parsed.data.email, isDeleted: false },
    })

    const isValid = user ? await verifyPassword(user.password, parsed.data.password) : false

    // Same message for unknown email and wrong password, so emails can't be enumerated
    if (!user || !isValid) {
        return { status: false, message: 'Email veya şifre hatalı' }
    }

    await createSession(user.id)

    // The password hash never leaves the server
    return { status: true, message: 'Giriş yapıldı', href: '/app', user: { ...user, password: '' } }
}

export async function logout(): Promise<LogoutResponse> {
    await deleteSession()
    return { status: true, message: 'Çıkış yapıldı', href: '/' }
}
