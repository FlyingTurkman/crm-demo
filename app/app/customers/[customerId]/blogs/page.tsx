import { notFound } from 'next/navigation'
import type { PostStatus } from '@prisma/client'
import { getPosts } from '@/actions/post'
import { postSorts, postStatusLabels } from '@/lib/src/constants'
import CustomerBlogsPageClient from './page.client'

type PostSort = (typeof postSorts)[number]

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ customerId: string }>
    searchParams: Promise<{ q?: string, status?: string, sort?: string, page?: string }>
}) {
    const { customerId } = await params
    const query = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const search = query.q?.trim() || undefined
    const status = query.status && query.status in postStatusLabels ? query.status as PostStatus : undefined
    const sort = postSorts.find(function (item) {
        return item === query.sort
    }) as PostSort | undefined
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)

    const result = await getPosts({ customerId, query: search, status, sort, page })

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
            filters={{ query: search ?? '', status, sort: sort ?? 'updated' }}
        />
    )
}
