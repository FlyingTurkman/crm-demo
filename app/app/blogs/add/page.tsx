import type { Metadata } from 'next'
import { getPostAssignees } from '@/actions/post'
import { parseDateTimeValue } from '@/lib/period'
import AddPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Yeni İçerik',
}

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ scheduledAt?: string }>
}) {
    const { scheduledAt } = await searchParams
    const result = await getPostAssignees()

    return (
        <AddPageClient users={result.users ?? []} initialScheduledAt={getInitialScheduledAt(scheduledAt)} />
    )
}

// Agenda links prefill the publish time, invalid values are ignored
function getInitialScheduledAt(value: string | undefined) {
    return value && parseDateTimeValue(value) ? value : undefined
}
