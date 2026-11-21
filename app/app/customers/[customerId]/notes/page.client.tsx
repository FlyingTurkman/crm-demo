'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { IoAdd } from 'react-icons/io5'
import { deleteNote } from '@/actions/note'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import RichTextView from '@/components/app/editor/RichTextView'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { noteSortLabels, noteSorts, pageLimit } from '@/lib/src/constants'
import { cn } from '@/lib/utils'
import type { Note } from '@/types'

type CustomerNoteListFilters = {
    query: string
    sort: (typeof noteSorts)[number]
}

export default function CustomerNotesPageClient({
    customerId,
    notes,
    total,
    page,
    pageCount,
    filters
}: {
    customerId: string
    notes: Note[]
    total: number
    page: number
    pageCount: number
    filters: CustomerNoteListFilters
}) {
    // Shared by filters and pagination: dims the list while the next page loads
    const [isPending, startTransition] = useTransition()
    const baseHref = `/app/customers/${customerId}/notes`
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <p className='text-sm text-muted-foreground'>
                    {total === 0 ? 'Gösterilecek not yok' : `${total} nottan ${firstIndex}-${lastIndex} arası gösteriliyor`}
                </p>
                <Link href={`${baseHref}/add`} className={buttonVariants()}>
                    <IoAdd /> Yeni Not Ekle
                </Link>
            </div>

            <ListFilters
                query={filters.query}
                placeholder='Not içeriğinde ara...'
                selects={[
                    {
                        param: 'sort',
                        value: filters.sort,
                        defaultValue: 'updated',
                        items: noteSortLabels,
                        label: 'Sıralama',
                        className: 'lg:w-48',
                    },
                ]}
                isPending={isPending}
                startTransition={startTransition}
            />

            {notes.length === 0 && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                    {filters.query ? 'Aramaya uyan not bulunamadı' : 'Bu müşterinin henüz notu yok'}
                </p>
            )}

            {notes.map((note) => (
                <Card key={note.id} className={cn('transition-opacity', isPending && 'opacity-60')}>
                    <CardHeader>
                        <CardDescription>
                            {formatDateTime(note.createdAt)}
                            {note.updatedAt > note.createdAt && ` · Düzenlendi: ${formatDateTime(note.updatedAt)}`}
                        </CardDescription>
                        <CardAction>
                            <EditDeleteMenu
                                size='sm'
                                editLabel='Notu Düzenle'
                                editHref={`${baseHref}/${note.id}/edit`}
                                deleteDescription='Bu not silinecek.'
                                deletePermission='note:delete'
                                onDelete={function () {
                                    return deleteNote({ noteId: note.id })
                                }}
                            />
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <RichTextView html={note.rawContent} />
                    </CardContent>
                </Card>
            ))}

            <ListPagination page={page} pageCount={pageCount} startTransition={startTransition} />
        </div>
    )
}
