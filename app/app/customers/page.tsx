import type { Metadata } from 'next'
import type { PostStatus } from '@prisma/client'
import { getCustomers } from '@/actions/customer'
import { parsePeriod } from '@/lib/period'
import { customerSorts, postStatusLabels } from '@/lib/src/constants'
import CustomersPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Müşteriler',
}

type CustomerSort = (typeof customerSorts)[number]

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ q?: string, status?: string, period?: string, sort?: string, page?: string }>
}) {
    const params = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const query = params.q?.trim() || undefined
    const postStatus = params.status && params.status in postStatusLabels ? params.status as PostStatus : undefined
    const sort = customerSorts.find(function (item) {
        return item === params.sort
    }) as CustomerSort | undefined
    const period = parsePeriod(params.period)
    const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

    const result = await getCustomers({ query, postStatus, period, sort, page })

    return (
        <CustomersPageClient
            customers={result.customers ?? []}
            total={result.total ?? 0}
            page={result.page ?? 1}
            pageCount={result.pageCount ?? 1}
            filters={{ query: query ?? '', postStatus, period, sort: sort ?? 'updated' }}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}
