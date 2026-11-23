'use client'

import NoteForm from '@/components/app/notes/NoteForm'

// Note for any customer: the customer is picked in the form with a search bar
export default function AddPageClient() {
    return (
        <div className='p-4'>
            <NoteForm />
        </div>
    )
}
