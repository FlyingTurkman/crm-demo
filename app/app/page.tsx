import type { Metadata } from 'next'
import { getDashboardStats } from '@/actions/dashboard'
import { parseDateParam, parsePeriod, toDateParam } from '@/lib/period'
import AppPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Ana Sayfa',
}

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ period?: string, date?: string }>
}) {
    const params = await searchParams
    // Range of the 'recently added' section, unknown values fall back to today
    const period = parsePeriod(params.period) ?? 'today'
    // Day the stats are calculated for, invalid or future dates fall back to today
    const date = toDateParam(parseDateParam(params.date))
    const result = await getDashboardStats({ period, date })

    return (
        <AppPageClient
            stats={result.stats}
            period={period}
            date={date}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}
