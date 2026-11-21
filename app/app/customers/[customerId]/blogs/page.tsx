import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { PostStatus } from '@prisma/client'
import { getPosts } from '@/actions/post'
import { parsePeriod } from '@/lib/period'
import { postSorts, postStatusLabels } from '@/lib/src/constants'
import { getCustomerPageTitle } from '@/lib/data'
import CustomerBlogsPageClient from './page.client'

export async function generateMetadata({ params }: { params: Promise<{ customerId: string }> }): Promise<Metadata> {
    const { customerId } = await params
    return { title: await getCustomerPageTitle(customerId, 'Bloglar') }
}

type PostSort = (typeof postSorts)[number]

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ customerId: string }>
    searchParams: Promise<{ q?: string, status?: string, period?: string, sort?: string, page?: string }>
}) {
    const { customerId } = await params
    const query = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const search = query.q?.trim() || undefined
    const status = query.status && query.status in postStatusLabels ? query.status as PostStatus : undefined
    const sort = postSorts.find(function (item) {
        return item === query.sort
    }) as PostSort | undefined
    const period = parsePeriod(query.period)
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)

    const result = await getPosts({ customerId, query: search, status, period, sort, page })

    if (!result.posts) {
        notFound()
    }

    return (
        <CustomerBlogsPageClient
            customerId={customerId}
            posts={result.posts}
            total={result.total ?? 0}
            page={result.page ?? 1}
            pageCount={result.pageCount ?? 1}
            filters={{ query: search ?? '', status, period, sort: sort ?? 'updated' }}
        />
    )
}
