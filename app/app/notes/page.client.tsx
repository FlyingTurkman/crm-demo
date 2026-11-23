'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { IoAdd } from 'react-icons/io5'
import { deleteNote } from '@/actions/note'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, getNotePreview } from '@/lib/format'
import { createdPeriodLabels, noteSortLabels, noteSorts, pageLimit } from '@/lib/src/constants'
import type { CreatedPeriod } from '@/lib/period'
import { cn } from '@/lib/utils'
import type { Note } from '@/types'

type NoteListFilters = {
    query: string
    period?: CreatedPeriod
    sort: (typeof noteSorts)[number]
}

export default function NotesPageClient({
    notes,
    total,
    page,
    pageCount,
    filters,
    errorMessage
}: {
    notes: Note[]
    total: number
    page: number
    pageCount: number
    filters: NoteListFilters
    errorMessage?: string
}) {
    // Shared by filters and pagination: dims the table while the next page loads
    const [isPending, startTransition] = useTransition()
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <div className='min-w-0'>
                    <h1 className='text-2xl font-semibold'>Notlar</h1>
                    <p className='text-sm text-muted-foreground'>
                        {total === 0 ? 'Gösterilecek not yok' : `${total} nottan ${firstIndex}-${lastIndex} arası gösteriliyor`}
                    </p>
                </div>
                <Link href='/app/notes/add' className={cn(buttonVariants(), 'shrink-0')}>
                    <IoAdd /> Yeni Not
                </Link>
            </div>

            <ListFilters
                query={filters.query}
                placeholder='Not içeriğinde ara...'
                selects={[
                    {
                        param: 'period',
                        value: filters.period ?? 'all',
                        defaultValue: 'all',
                        items: createdPeriodLabels,
                        label: 'Eklenme zamanı',
                        className: 'lg:w-44',
                    },
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

            {errorMessage && (
                <p className='text-sm text-destructive'>{errorMessage}</p>
            )}

            <div className={cn('rounded-lg border transition-opacity', isPending && 'opacity-60')}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Not</TableHead>
                            <TableHead>Müşteri</TableHead>
                            <TableHead className='hidden md:table-cell'>Son Güncelleme</TableHead>
                            <TableHead className='w-0' />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {notes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                                    {filters.query || filters.period ? 'Filtrelere uyan not bulunamadı' : 'Henüz not yok'}
                                </TableCell>
                            </TableRow>
                        )}
                        {notes.map((note) => (
                            <TableRow key={note.id}>
                                <TableCell className='max-w-96'>
                                    <Link
                                        href={`/app/customers/${note.customerId}/notes/${note.id}/edit`}
                                        className='block truncate font-medium hover:underline'
                                    >
                                        {getNotePreview(note.content)}
                                    </Link>
                                    <p className='truncate text-xs text-muted-foreground'>{note.content}</p>
                                </TableCell>
                                <TableCell>
                                    <Link href={`/app/customers/${note.customerId}/notes`} className='text-muted-foreground hover:underline'>
                                        {note.customer?.fullName}
                                    </Link>
                                </TableCell>
                                <TableCell className='hidden text-muted-foreground md:table-cell'>{formatDate(note.updatedAt)}</TableCell>
                                <TableCell>
                                    <EditDeleteMenu
                                        size='sm'
                                        editLabel='Notu Düzenle'
                                        editHref={`/app/customers/${note.customerId}/notes/${note.id}/edit`}
                                        deleteDescription='Bu not silinecek.'
                                        deletePermission='note:delete'
                                        onDelete={function () {
                                            return deleteNote({ noteId: note.id })
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ListPagination page={page} pageCount={pageCount} startTransition={startTransition} />
        </div>
    )
}
