'use server'

import type { PostStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorize'
import { getRangeEndingOn, parseDateParam } from '@/lib/period'
import { createdPeriods, dashboardListLimit } from '@/lib/src/constants'
import type { Customer, Note, Post, Response } from '@/types'

// The dashboard reads every model, so its query lives in its own file instead of a model's

const getDashboardStatsSchema = z.object({
    // Range of the 'recently added' section, today by default
    period: z.enum(createdPeriods, 'Geçersiz tarih aralığı').default('today'),
    // Day the dashboard is looked at (YYYY-MM-DD), today by default; future dates fall back to today
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih').optional(),
})

export type DashboardStats = {
    // total: created until the end of the selected day, onDay: created on that day,
    // inPeriod: created in the range that ends with that day
    customers: { total: number, onDay: number, inPeriod: number }
    posts: { total: number, onDay: number, inPeriod: number, byStatus: Record<PostStatus, number> }
    notes: { total: number, onDay: number, inPeriod: number }
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

    const day = parseDateParam(parsed.data.date)
    const dayRange = getRangeEndingOn(day, 'today')
    const periodRange = getRangeEndingOn(day, parsed.data.period)
    const today = { createdAt: { gte: dayRange.start, lt: dayRange.end } }
    const inPeriod = { createdAt: { gte: periodRange.start, lt: periodRange.end } }
    // Everything is counted as of the end of the selected day
    const asOfDay = { createdAt: { lt: dayRange.end } }
    const customerWhere = { isDeleted: false, ...asOfDay }
    // Children of a deleted customer are soft-deleted with it, the relation filter is a safety net
    const postWhere = { isDeleted: false, customer: { isDeleted: false }, ...asOfDay }
    const noteWhere = { isDeleted: false, customer: { isDeleted: false }, ...asOfDay }

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
        topPostGroups,
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
            // Status is the current one: status changes have no history
            where: { isDeleted: false, ...asOfDay },
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
        // Raw pipeline: Prisma's MongoDB groupBy ignores `orderBy: { _count }` when combined with `take`
        // and returns arbitrary groups, so sorting and limiting are done by MongoDB itself
        prisma.post.aggregateRaw({
            pipeline: [
                { $match: { isDeleted: false, createdAt: { $lt: { $date: dayRange.end.toISOString() } } } },
                { $group: { _id: '$customerId', postCount: { $sum: 1 } } },
                { $sort: { postCount: -1, _id: 1 } },
                { $limit: dashboardListLimit },
            ],
        }) as unknown as Promise<{ _id: { $oid: string }, postCount: number }[]>,
    ])
    const postGroups = topPostGroups.map((group) => ({
        customerId: group._id.$oid,
        postCount: group.postCount,
    }))

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
            postCount: group.postCount,
        }))
        .filter(function (item): item is typeof item & { customer: NonNullable<typeof item.customer> } {
            return Boolean(item.customer)
        })

    return {
        status: true,
        stats: {
            customers: { total: customerTotal, onDay: customerToday, inPeriod: customerInPeriod },
            posts: { total: postTotal, onDay: postToday, inPeriod: postInPeriod, byStatus },
            notes: { total: noteTotal, onDay: noteToday, inPeriod: noteInPeriod },
            recentCustomers,
            recentPosts,
            recentNotes,
            topCustomers,
        },
    }
}
