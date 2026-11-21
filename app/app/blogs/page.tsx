import type { Metadata } from 'next'
import type { PostStatus } from '@prisma/client'
import { getAllPosts } from '@/actions/post'
import { postSorts, postStatusLabels } from '@/lib/src/constants'
import BlogsPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Bloglar',
}

type PostSort = (typeof postSorts)[number]

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ q?: string, status?: string, sort?: string, page?: string }>
}) {
    const params = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const query = params.q?.trim() || undefined
    const status = params.status && params.status in postStatusLabels ? params.status as PostStatus : undefined
    const sort = postSorts.find(function (item) {
        return item === params.sort
    }) as PostSort | undefined
    const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

    const result = await getAllPosts({ query, status, sort, page })

    return (
        <BlogsPageClient
            posts={result.posts ?? []}
            total={result.total ?? 0}
            page={result.page ?? 1}
            pageCount={result.pageCount ?? 1}
            filters={{ query: query ?? '', status, sort: sort ?? 'updated' }}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}
