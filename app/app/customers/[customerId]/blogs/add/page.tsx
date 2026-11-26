import type { Metadata } from 'next'
import { getPostAssignees } from '@/actions/post'
import { parseDateTimeValue } from '@/lib/period'
import { getCustomerPageTitle } from '@/lib/data'
import NewBlogPageClient from './page.client'

export async function generateMetadata({ params }: { params: Promise<{ customerId: string }> }): Promise<Metadata> {
    const { customerId } = await params
    return { title: await getCustomerPageTitle(customerId, 'Yeni İçerik') }
}

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ customerId: string }>
    searchParams: Promise<{ scheduledAt?: string }>
}) {
    const { customerId } = await params
    const { scheduledAt } = await searchParams
    const result = await getPostAssignees()

    return (
        <NewBlogPageClient
            customerId={customerId}
            users={result.users ?? []}
            initialScheduledAt={getInitialScheduledAt(scheduledAt)}
        />
    )
}

// Agenda links prefill the publish time, invalid values are ignored
function getInitialScheduledAt(value: string | undefined) {
    return value && parseDateTimeValue(value) ? value : undefined
}
