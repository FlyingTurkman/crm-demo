import type { Metadata } from 'next'
import type { PostPlatform, PostStatus, PostType } from '@prisma/client'
import { getAllPosts } from '@/actions/post'
import { parseDueFilter, parsePeriod } from '@/lib/period'
import { postAssigneeFilters, postPlatformLabels, postSorts, postStatusLabels, postTypeLabels } from '@/lib/src/constants'
import BlogsPageClient from './page.client'

export const metadata: Metadata = {
    title: 'İçerikler',
}

type PostSort = (typeof postSorts)[number]

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ q?: string, status?: string, type?: string, platform?: string, due?: string, assignee?: string, period?: string, sort?: string, page?: string }>
}) {
    const params = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const query = params.q?.trim() || undefined
    const status = params.status && params.status in postStatusLabels ? params.status as PostStatus : undefined
    const sort = postSorts.find(function (item) {
        return item === params.sort
    }) as PostSort | undefined
    const type = params.type && params.type in postTypeLabels ? params.type as PostType : undefined
    const platform = params.platform && params.platform in postPlatformLabels ? params.platform as PostPlatform : undefined
    const due = parseDueFilter(params.due)
    const assignee = postAssigneeFilters.find(function (item) {
        return item === params.assignee
    })
    const period = parsePeriod(params.period)
    const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

    const result = await getAllPosts({ query, status, type, platform, due, assignee, period, sort, page })

    return (
        <BlogsPageClient
            posts={result.posts ?? []}
            total={result.total ?? 0}
            page={result.page ?? 1}
            pageCount={result.pageCount ?? 1}
            filters={{ query: query ?? '', status, type, platform, due, assignee, period, sort: sort ?? 'updated' }}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}
