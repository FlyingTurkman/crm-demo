'use server'

import { revalidatePath } from 'next/cache'
import { PostStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { paginate } from '@/lib/pagination'
import { authorize } from '@/lib/auth/authorize'
import { getPeriodWhere } from '@/lib/period'
import { getSearchWhere } from '@/lib/search'
import {
    createdPeriods,
    customerSorts,
    maxCompanyLength,
    maxNameLength,
    maxPhoneLength,
    maxSearchLength,
    objectIdPattern,
    pageLimit,
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
    postStatus: z.enum(PostStatus, 'Geçersiz içerik durumu').optional(),
    period: z.enum(createdPeriods, 'Geçersiz tarih aralığı').optional(),
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

    const { query, postStatus, period, sort, page } = parsed.data
    const where: Prisma.CustomerWhereInput = {
        isDeleted: false,
        // Name, email, phone and company (Turkish-insensitive, see lib/src/searchText.ts)
        ...getSearchWhere(query),
        // Only customers that have at least one (not deleted) post in this status
        ...(postStatus ? { posts: { some: { status: postStatus, isDeleted: false } } } : {}),
        ...getPeriodWhere(period),
    }

    const orderBy: Record<CustomerSort, Prisma.CustomerOrderByWithRelationInput> = {
        updated: { updatedAt: 'desc' },
        created: { createdAt: 'desc' },
        name: { fullName: 'asc' },
    }

    const result = await paginate(page, function () {
        return prisma.customer.count({ where })
    }, function (skip) {
        return prisma.customer.findMany({
            where,
            orderBy: orderBy[sort],
            skip,
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
    })
    const customers = result.items
    return { status: true, customers, total: result.total, page: result.page, pageCount: result.pageCount }
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

    // Both queries only need the id, so they run in parallel (the counts are ignored if not found)
    const [customer, statusGroups] = await Promise.all([
        prisma.customer.findFirst({
            where: { id: customerId, isDeleted: false },
            include: {
                _count: {
                    select: {
                        notes: { where: { isDeleted: false } },
                        posts: { where: { isDeleted: false } },
                    },
                },
            },
        }),
        prisma.post.groupBy({
            by: ['status'],
            where: { customerId, isDeleted: false },
            _count: { _all: true },
        }),
    ])
    if (!customer) {
        return { status: false, message: 'Müşteri bulunamadı' }
    }
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

    const customers = await prisma.customer.findMany({
        where: {
            isDeleted: false,
            ...getSearchWhere(parsed.data.query),
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
