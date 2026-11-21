import type { Metadata } from 'next'
import { getDashboardStats } from '@/actions/dashboard'
import { parsePeriod } from '@/lib/period'
import AppPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Ana Sayfa',
}

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ period?: string }>
}) {
    const params = await searchParams
    // Range of the 'recently added' section, unknown values fall back to today
    const period = parsePeriod(params.period) ?? 'today'
    const result = await getDashboardStats({ period })

    return (
        <AppPageClient stats={result.stats} period={period} errorMessage={result.status ? undefined : result.message} />
    )
}
