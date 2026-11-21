'use server'

import { revalidatePath } from 'next/cache'
import { PostStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorize'
import { escapeRegex } from '@/lib/search'
import {
    pageLimit,
    customerSorts,
    maxCompanyLength,
    maxNameLength,
    maxPhoneLength,
    maxSearchLength,
    objectIdPattern,
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

const getCustomersSchema = z.object({
    query: z
        .string()
        .trim()
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`)
        .optional(),
    postStatus: z.enum(PostStatus, 'Geçersiz blog durumu').optional(),
    sort: z.enum(customerSorts, 'Geçersiz sıralama').default('updated'),
    page: z.coerce.number().int().min(1, 'Geçersiz sayfa').default(1),
})

const updateCustomerSchema = createCustomerSchema.extend({
    customerId: z.string().regex(objectIdPattern, 'Geçersiz müşteri'),
})

const getCustomerSchema = z.object({
    // MongoDB ObjectId: 24 hex characters, anything else would make Prisma throw
    customerId: z.string().regex(objectIdPattern, 'Geçersiz müşteri'),
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
    total?: number
    page?: number
    pageCount?: number
}

type GetRecentCustomersResponse = Response & {
    customers?: Customer[]
}

type SearchCustomersResponse = Response & {
    customers?: Customer[]
}

type UpdateCustomerResponse = Response & {
    customer?: Customer
    href?: string
}

type CustomerSort = (typeof customerSorts)[number]

type CreateCustomerResponse = Response & {
    customer?: Customer
    href?: string
}

export async function getCustomers(input: z.input<typeof getCustomersSchema>): Promise<GetCustomersResponse> {
    const auth = await authorize('customer:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getCustomersSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { query, postStatus, sort, page } = parsed.data
    const search = query ? escapeRegex(query) : ''

    const where: Prisma.CustomerWhereInput = {
        isDeleted: false,
        ...(search ? {
            OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { company: { contains: search, mode: 'insensitive' } },
            ],
        } : {}),
        // Only customers that have at least one (not deleted) post in this status
        ...(postStatus ? { posts: { some: { status: postStatus, isDeleted: false } } } : {}),
    }

    const orderBy: Record<CustomerSort, Prisma.CustomerOrderByWithRelationInput> = {
        updated: { updatedAt: 'desc' },
        created: { createdAt: 'desc' },
        name: { fullName: 'asc' },
    }

    const total = await prisma.customer.count({ where })
    const pageCount = Math.max(1, Math.ceil(total / pageLimit))
    // A page past the end (e.g. after filtering) falls back to the last page
    const currentPage = Math.min(page, pageCount)

    const customers = await prisma.customer.findMany({
        where,
        orderBy: orderBy[sort],
        skip: (currentPage - 1) * pageLimit,
        take: pageLimit,
        include: {
            _count: {
                select: {
                    notes: { where: { isDeleted: false } },
                    posts: { where: { isDeleted: false } },
                },
            },
        },
    })
    return { status: true, customers, total, page: currentPage, pageCount }
}

export async function getRecentCustomers(): Promise<GetRecentCustomersResponse> {
    const auth = await authorize('customer:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        orderBy: { updatedAt: 'desc' },
        take: sidebarCustomerLimit,
    })
    return { status: true, customers }
}

export async function getCustomer(input: z.input<typeof getCustomerSchema>): Promise<GetCustomerResponse> {
    const auth = await authorize('customer:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
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
    const auth = await authorize('customer:delete')
    if (!auth.user) {
        return { status: false, message: auth.message }
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
    revalidatePath('/app/notes', 'layout')
    revalidatePath('/app/blogs', 'layout')
    return { status: true, message: 'Müşteri silindi', href: '/app/customers' }
}

export async function searchCustomers(input: z.input<typeof searchCustomersSchema>): Promise<SearchCustomersResponse> {
    const auth = await authorize('customer:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = searchCustomersSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const query = escapeRegex(parsed.data.query)

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
    const auth = await authorize('customer:create')
    if (!auth.user) {
        return { status: false, message: auth.message }
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
        revalidatePath('/app/notes', 'layout')
        revalidatePath('/app/blogs', 'layout')
        return { status: true, message: 'Müşteri oluşturuldu', customer, href: '/app/customers' }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { status: false, message: 'Bu email ile kayıtlı bir müşteri zaten var' }
        }
        throw error
    }
}

export async function updateCustomer(input: z.input<typeof updateCustomerSchema>): Promise<UpdateCustomerResponse> {
    const auth = await authorize('customer:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updateCustomerSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId, name, surname, email, phone, company } = parsed.data

    const existing = await prisma.customer.findFirst({
        where: { id: customerId, isDeleted: false },
        select: { id: true },
    })
    if (!existing) {
        return { status: false, message: 'Müşteri bulunamadı' }
    }

    try {
        const customer = await prisma.customer.update({
            where: { id: customerId },
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
        revalidatePath('/app/customers', 'layout')
        revalidatePath('/app/notes', 'layout')
        revalidatePath('/app/blogs', 'layout')
        return { status: true, message: 'Müşteri güncellendi', customer, href: `/app/customers/${customer.id}` }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { status: false, message: 'Bu email ile kayıtlı başka bir müşteri var' }
        }
        throw error
    }
}
