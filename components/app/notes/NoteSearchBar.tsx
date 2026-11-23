'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IoDocumentText, IoSearch } from 'react-icons/io5'
import { searchNotes } from '@/actions/note'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import { buttonVariants } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { getNotePreview } from '@/lib/format'
import { searchDebounceMs } from '@/lib/src/constants'
import type { Note } from '@/types'

export default function NoteSearchBar() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [notes, setNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const trimmedQuery = query.trim()

    // Debounce: search only after the user stops typing for searchDebounceMs
    useEffect(function () {
        if (!trimmedQuery) {
            return
        }

        let isCancelled = false
        const timeout = setTimeout(async function () {
            setIsLoading(true)
            const result = await searchNotes({ query: trimmedQuery })
            // Ignore responses of older queries
            if (isCancelled) {
                return
            }
            setNotes(result.notes ?? [])
            setIsLoading(false)
        }, searchDebounceMs)

        return function () {
            isCancelled = true
            clearTimeout(timeout)
        }
    }, [trimmedQuery])

    return (
        // Desktop: popover, mobile: drawer from the bottom of the screen
        <ResponsivePopover
            modal
            open={open}
            onOpenChange={setOpen}
            title='Not ara'
            triggerClassName={buttonVariants({ variant: 'secondary' })}
            trigger={<>Not ara <IoSearch /></>}
            contentClassName='w-80 max-w-[calc(100vw-2rem)] p-0'
        >
            <Command shouldFilter={false}>
                <CommandInput
                    placeholder='Not içeriğinde ara...'
                    value={query}
                    onValueChange={handleQueryChange}
                />
                <CommandList>
                    {isLoading && (
                        <div className='flex justify-center py-6'>
                            <Spinner />
                        </div>
                    )}
                    {!isLoading && trimmedQuery && (
                        <CommandEmpty>Not bulunamadı</CommandEmpty>
                    )}
                    {!isLoading && trimmedQuery && notes.map((note) => (
                        <CommandItem
                            key={note.id}
                            value={`/app/customers/${note.customerId}/notes/${note.id}/edit`}
                            onSelect={handleSelect}
                        >
                            <IoDocumentText className='text-muted-foreground' />
                            <div className='grid flex-1 leading-tight'>
                                <span className='truncate'>{getNotePreview(note.content)}</span>
                                <span className='truncate text-xs text-muted-foreground'>
                                    {note.customer?.fullName}
                                </span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandList>
            </Command>
        </ResponsivePopover>
    )

    function handleQueryChange(value: string) {
        setQuery(value)
        if (!value.trim()) {
            setNotes([])
            setIsLoading(false)
        }
    }

    function handleSelect(href: string) {
        setOpen(false)
        router.push(href)
    }
}
