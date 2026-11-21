'use client'

import NoteForm from '@/components/app/notes/NoteForm'

export default function NewNotePageClient({ customerId }: { customerId: string }) {
    return (
        <NoteForm customerId={customerId} />
    )
}
