import type { Metadata } from 'next'
import { getAgenda } from '@/actions/post'
import { parseDayValue, toDateParam } from '@/lib/period'
import { objectIdPattern } from '@/lib/src/constants'
import AgendaPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Ajanda',
}

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ date?: string, assignee?: string }>
}) {
    const params = await searchParams
    // Unknown values in the URL are ignored instead of failing validation:
    // first day of the week (past and future weeks are fine) and whose work is shown
    const date = params.date && parseDayValue(params.date) ? params.date : undefined
    const assignee = isAssigneeFilter(params.assignee) ? params.assignee : undefined
    const result = await getAgenda({ date, assignee })

    return (
        <AgendaPageClient
            start={result.start ?? toDateParam(new Date())}
            assignee={assignee}
            assigneeUser={result.assigneeUser}
            scheduledPosts={result.scheduledPosts ?? []}
            duePosts={result.duePosts ?? []}
            isTruncated={result.isTruncated ?? false}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}

function isAssigneeFilter(value: string | undefined): value is string {
    return value === 'me' || value === 'none' || Boolean(value && objectIdPattern.test(value))
}
