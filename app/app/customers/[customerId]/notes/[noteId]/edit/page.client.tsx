'use client'

import NoteForm from '@/components/app/notes/NoteForm'
import type { Note } from '@/types'

export default function EditNotePageClient({ note }: { note: Note }) {
    return (
        <NoteForm customerId={note.customerId} note={note} />
    )
}
