import { notFound } from 'next/navigation'
import { getNote } from '@/actions/note'
import EditNotePageClient from './page.client'

export default async function Page({
    params
}: {
    params: Promise<{ customerId: string, noteId: string }>
}) {
    const { customerId, noteId } = await params
    const result = await getNote({ noteId })

    // A note of another customer must not open under this customer's URL
    if (!result.note || result.note.customerId !== customerId) {
        notFound()
    }

    return (
        <EditNotePageClient note={result.note} />
    )
}
