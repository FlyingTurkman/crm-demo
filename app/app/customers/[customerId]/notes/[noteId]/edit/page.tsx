import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCustomerPageTitle, getNoteCached } from '@/lib/data'
import EditNotePageClient from './page.client'

type Params = Promise<{ customerId: string, noteId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { customerId } = await params
    return { title: await getCustomerPageTitle(customerId, 'Notu Düzenle') }
}

export default async function Page({
    params
}: {
    params: Params
}) {
    const { customerId, noteId } = await params
    const result = await getNoteCached(noteId)

    // A note of another customer must not open under this customer's URL
    if (!result.note || result.note.customerId !== customerId) {
        notFound()
    }

    return (
        <EditNotePageClient note={result.note} />
    )
}
