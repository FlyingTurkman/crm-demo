'use server'

import type { PostStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorize'
import { getPeriodStart, getStartOfToday } from '@/lib/period'
import { createdPeriods, dashboardListLimit } from '@/lib/src/constants'
import type { Customer, Note, Post, Response } from '@/types'

// The dashboard reads every model, so its query lives in its own file instead of a model's

const getDashboardStatsSchema = z.object({
    // Range of the 'recently added' section, today by default
    period: z.enum(createdPeriods, 'Geçersiz tarih aralığı').default('today'),
})

export type DashboardStats = {
    customers: { total: number, today: number, inPeriod: number }
    posts: { total: number, today: number, inPeriod: number, byStatus: Record<PostStatus, number> }
    notes: { total: number, today: number, inPeriod: number }
    recentCustomers: Customer[]
    recentPosts: Post[]
    recentNotes: Note[]
    topCustomers: { customer: Customer, postCount: number }[]
}

type GetDashboardStatsResponse = Response & {
    stats?: DashboardStats
}

export async function getDashboardStats(input: z.input<typeof getDashboardStatsSchema>): Promise<GetDashboardStatsResponse> {
    const auth = await authorize('dashboard:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getDashboardStatsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const today = { createdAt: { gte: getStartOfToday() } }
    const inPeriod = { createdAt: { gte: getPeriodStart(parsed.data.period) } }
    const customerWhere = { isDeleted: false }
    // Children of a deleted customer are soft-deleted with it, the relation filter is a safety net
    const postWhere = { isDeleted: false, customer: { isDeleted: false } }
    const noteWhere = { isDeleted: false, customer: { isDeleted: false } }

    const [
        customerTotal,
        customerToday,
        postTotal,
        postToday,
        noteTotal,
        noteToday,
        customerInPeriod,
        postInPeriod,
        noteInPeriod,
        statusGroups,
        recentCustomers,
        recentPosts,
        recentNotes,
        postGroups,
    ] = await Promise.all([
        prisma.customer.count({ where: customerWhere }),
        prisma.customer.count({ where: { ...customerWhere, ...today } }),
        prisma.post.count({ where: postWhere }),
        prisma.post.count({ where: { ...postWhere, ...today } }),
        prisma.note.count({ where: noteWhere }),
        prisma.note.count({ where: { ...noteWhere, ...today } }),
        prisma.customer.count({ where: { ...customerWhere, ...inPeriod } }),
        prisma.post.count({ where: { ...postWhere, ...inPeriod } }),
        prisma.note.count({ where: { ...noteWhere, ...inPeriod } }),
        prisma.post.groupBy({
            by: ['status'],
            where: { isDeleted: false },
            _count: { _all: true },
        }),
        prisma.customer.findMany({
            where: { ...customerWhere, ...inPeriod },
            orderBy: { createdAt: 'desc' },
            take: dashboardListLimit,
        }),
        prisma.post.findMany({
            where: { ...postWhere, ...inPeriod },
            orderBy: { createdAt: 'desc' },
            take: dashboardListLimit,
            include: { customer: true },
        }),
        prisma.note.findMany({
            where: { ...noteWhere, ...inPeriod },
            orderBy: { createdAt: 'desc' },
            take: dashboardListLimit,
            include: { customer: true },
        }),
        prisma.post.groupBy({
            by: ['customerId'],
            where: { isDeleted: false },
            _count: { _all: true },
            orderBy: { _count: { customerId: 'desc' } },
            take: dashboardListLimit,
        }),
    ])

    const byStatus: Record<PostStatus, number> = { draft: 0, inReview: 0, published: 0 }
    statusGroups.forEach(function (group) {
        byStatus[group.status] = group._count._all
    })

    const topCustomerRecords = await prisma.customer.findMany({
        where: {
            ...customerWhere,
            id: {
                in: postGroups.map((group) => group.customerId),
            },
        },
        take: dashboardListLimit,
    })
    const topCustomers = postGroups
        .map((group) => ({
            customer: topCustomerRecords.find(function (customer) {
                return customer.id === group.customerId
            }),
            postCount: group._count._all,
        }))
        .filter(function (item): item is { customer: Customer, postCount: number } {
            return Boolean(item.customer)
        })

    return {
        status: true,
        stats: {
            customers: { total: customerTotal, today: customerToday, inPeriod: customerInPeriod },
            posts: { total: postTotal, today: postToday, inPeriod: postInPeriod, byStatus },
            notes: { total: noteTotal, today: noteToday, inPeriod: noteInPeriod },
            recentCustomers,
            recentPosts,
            recentNotes,
            topCustomers,
        },
    }
}
