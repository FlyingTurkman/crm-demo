import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getNotes } from '@/actions/note'
import { noteSorts } from '@/lib/src/constants'
import { getCustomerPageTitle } from '@/lib/data'
import CustomerNotesPageClient from './page.client'

export async function generateMetadata({ params }: { params: Promise<{ customerId: string }> }): Promise<Metadata> {
    const { customerId } = await params
    return { title: await getCustomerPageTitle(customerId, 'Notlar') }
}

type NoteSort = (typeof noteSorts)[number]

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ customerId: string }>
    searchParams: Promise<{ q?: string, sort?: string, page?: string }>
}) {
    const { customerId } = await params
    const query = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const search = query.q?.trim() || undefined
    const sort = noteSorts.find(function (item) {
        return item === query.sort
    }) as NoteSort | undefined
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)

    const result = await getNotes({ customerId, query: search, sort, page })

    if (!result.notes) {
        notFound()
    }

    return (
        <CustomerNotesPageClient
            customerId={customerId}
            notes={result.notes}
            total={result.total ?? 0}
            page={result.page ?? 1}
            pageCount={result.pageCount ?? 1}
            filters={{ query: search ?? '', sort: sort ?? 'updated' }}
        />
    )
}
