'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, type PostStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth/session'
import {
    maxCompanyLength,
    maxNameLength,
    maxPhoneLength,
    maxSearchLength,
    searchResultLimit,
    sidebarCustomerLimit,
} from '@/lib/src/constants'
import type { Customer, Response } from '@/types'

const createCustomerSchema = z.object({
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
    phone: z
        .string()
        .trim()
        .max(maxPhoneLength, `Telefon en fazla ${maxPhoneLength} karakter olabilir`)
        .optional(),
    company: z
        .string()
        .trim()
        .max(maxCompanyLength, `Firma en fazla ${maxCompanyLength} karakter olabilir`)
        .optional(),
})

const searchCustomersSchema = z.object({
    query: z
        .string()
        .trim()
        .min(1, 'Arama metni boş olamaz')
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`),
})

const getCustomerSchema = z.object({
    // MongoDB ObjectId: 24 hex characters, anything else would make Prisma throw
    customerId: z.string().regex(/^[0-9a-f]{24}$/i, 'Geçersiz müşteri'),
})

type GetCustomerResponse = Response & {
    customer?: Customer
    postStatusCounts?: Record<PostStatus, number>
}

type DeleteCustomerResponse = Response & {
    href?: string
}

type GetCustomersResponse = Response & {
    customers?: Customer[]
}

type CreateCustomerResponse = Response & {
    customer?: Customer
    href?: string
}

export async function getCustomers(): Promise<GetCustomersResponse> {
    const user = await getCurrentUser()
    if (!user) {
        return { status: false, message: 'Bu işlem için giriş yapmalısınız' }
    }

    const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { posts: { where: { isDeleted: false } } } } },
    })
    return { status: true, customers }
}

export async function getRecentCustomers(): Promise<GetCustomersResponse> {
    const user = await getCurrentUser()
    if (!user) {
        return { status: false, message: 'Bu işlem için giriş yapmalısınız' }
    }

    const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        orderBy: { updatedAt: 'desc' },
        take: sidebarCustomerLimit,
    })
    return { status: true, customers }
}

export async function getCustomer(input: z.input<typeof getCustomerSchema>): Promise<GetCustomerResponse> {
    const user = await getCurrentUser()
    if (!user) {
        return { status: false, message: 'Bu işlem için giriş yapmalısınız' }
    }

    const parsed = getCustomerSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId } = parsed.data

    const customer = await prisma.customer.findFirst({
        where: { id: customerId, isDeleted: false },
        include: {
            _count: {
                select: {
                    notes: { where: { isDeleted: false } },
                    posts: { where: { isDeleted: false } },
                },
            },
        },
    })
    if (!customer) {
        return { status: false, message: 'Müşteri bulunamadı' }
    }

    const statusGroups = await prisma.post.groupBy({
        by: ['status'],
        where: { customerId, isDeleted: false },
        _count: { _all: true },
    })
    const postStatusCounts: Record<PostStatus, number> = { draft: 0, inReview: 0, published: 0 }
    statusGroups.forEach(function (group) {
        postStatusCounts[group.status] = group._count._all
    })

    return { status: true, customer, postStatusCounts }
}

export async function deleteCustomer(input: z.input<typeof getCustomerSchema>): Promise<DeleteCustomerResponse> {
    const user = await getCurrentUser()
    if (!user) {
        return { status: false, message: 'Bu işlem için giriş yapmalısınız' }
    }

    const parsed = getCustomerSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId } = parsed.data

    const customer = await prisma.customer.findFirst({
        where: { id: customerId, isDeleted: false },
        select: { id: true },
    })
    if (!customer) {
        return { status: false, message: 'Müşteri bulunamadı' }
    }

    // Soft delete the customer together with its notes and posts
    await prisma.$transaction([
        prisma.note.updateMany({ where: { customerId, isDeleted: false }, data: { isDeleted: true } }),
        prisma.post.updateMany({ where: { customerId, isDeleted: false }, data: { isDeleted: true } }),
        prisma.customer.update({ where: { id: customerId }, data: { isDeleted: true } }),
    ])

    revalidatePath('/app/customers', 'layout')
    return { status: true, message: 'Müşteri silindi', href: '/app/customers' }
}

export async function searchCustomers(input: z.input<typeof searchCustomersSchema>): Promise<GetCustomersResponse> {
    const user = await getCurrentUser()
    if (!user) {
        return { status: false, message: 'Bu işlem için giriş yapmalısınız' }
    }

    const parsed = searchCustomersSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    // Prisma sends `contains` to MongoDB as a regex without escaping it:
    // '(' would crash the query and '.' would match everything
    const query = parsed.data.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const customers = await prisma.customer.findMany({
        where: {
            isDeleted: false,
            OR: [
                { fullName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } },
            ],
        },
        orderBy: { updatedAt: 'desc' },
        take: searchResultLimit,
    })
    return { status: true, customers }
}

export async function createCustomer(input: z.input<typeof createCustomerSchema>): Promise<CreateCustomerResponse> {
    const user = await getCurrentUser()
    if (!user) {
        return { status: false, message: 'Bu işlem için giriş yapmalısınız' }
    }

    const parsed = createCustomerSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { name, surname, email, phone, company } = parsed.data

    try {
        const customer = await prisma.customer.create({
            data: {
                name,
                surname,
                fullName: `${name} ${surname}`,
                email,
                // Empty optional inputs are stored as null, not ''
                phone: phone || null,
                company: company || null,
            },
        })
        // 'layout' also refreshes the customers sidebar on every /app/customers/** page
        revalidatePath('/app/customers', 'layout')
        return { status: true, message: 'Müşteri oluşturuldu', customer, href: '/app/customers' }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { status: false, message: 'Bu email ile kayıtlı bir müşteri zaten var' }
        }
        throw error
    }
}
