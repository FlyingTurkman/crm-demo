import type { Metadata } from 'next'
import type { UserRole } from '@prisma/client'
import { getUsers } from '@/actions/user'
import { parsePeriod } from '@/lib/period'
import { userRoleLabels, userSorts } from '@/lib/src/constants'
import AdminPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Admin Paneli',
}

type UserSort = (typeof userSorts)[number]

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ q?: string, role?: string, period?: string, sort?: string, page?: string }>
}) {
    const params = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const query = params.q?.trim() || undefined
    const role = params.role && params.role in userRoleLabels ? params.role as UserRole : undefined
    const period = parsePeriod(params.period)
    const sort = userSorts.find(function (item) {
        return item === params.sort
    }) as UserSort | undefined
    const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

    const result = await getUsers({ query, role, period, sort, page })

    return (
        <AdminPageClient
            users={result.users ?? []}
            total={result.total ?? 0}
            page={result.page ?? 1}
            pageCount={result.pageCount ?? 1}
            filters={{ query: query ?? '', role, period, sort: sort ?? 'updated' }}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}
