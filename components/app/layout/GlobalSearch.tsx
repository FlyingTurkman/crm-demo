'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IoArrowForward, IoDocumentText, IoNewspaper, IoSearch } from 'react-icons/io5'
import { searchAll } from '@/actions/search'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { getNotePreview } from '@/lib/format'
import { searchDebounceMs } from '@/lib/src/constants'
import { cn } from '@/lib/utils'
import type { Customer, Note, Post } from '@/types'

type SearchResults = {
    customers: Customer[]
    posts: Post[]
    notes: Note[]
}

const emptyResults: SearchResults = { customers: [], posts: [], notes: [] }

// Menu search: customers, blogs and notes at once, grouped by category.
// Ctrl+K / ⌘K opens it from anywhere in the panel.
export default function GlobalSearch() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults>(emptyResults)
    const [isLoading, setIsLoading] = useState(false)
    const trimmedQuery = query.trim()
    const hasResults = results.customers.length + results.posts.length + results.notes.length > 0
    const encodedQuery = encodeURIComponent(trimmedQuery)

    // Debounce: search only after the user stops typing for searchDebounceMs
    useEffect(function () {
        if (!trimmedQuery) {
            return
        }

        let isCancelled = false
        const timeout = setTimeout(async function () {
            setIsLoading(true)
            const result = await searchAll({ query: trimmedQuery })
            // Ignore responses of older queries
            if (isCancelled) {
                return
            }
            setResults({
                customers: result.customers ?? [],
                posts: result.posts ?? [],
                notes: result.notes ?? [],
            })
            setIsLoading(false)
        }, searchDebounceMs)

        return function () {
            isCancelled = true
            clearTimeout(timeout)
        }
    }, [trimmedQuery])

    useEffect(function () {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setOpen(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return function () {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    return (
        <ResponsivePopover
            modal
            open={open}
            onOpenChange={setOpen}
            title='Ara'
            triggerId='main-menu-search-trigger'
            triggerLabel='Müşteri, blog ve notlarda ara'
            // Mobile: icon button, desktop: a search field look-alike with the shortcut.
            // Page background color, like an input on the primary bar.
            triggerClassName={cn(
                buttonVariants({ variant: 'ghost' }),
                'w-9 bg-background px-0 text-muted-foreground',
                'hover:bg-background hover:text-foreground aria-expanded:bg-background aria-expanded:text-foreground',
                'md:w-56 md:justify-start md:px-3 lg:w-72'
            )}
            trigger={
                <>
                    <IoSearch />
                    <span className='hidden md:inline'>Ara...</span>
                    <kbd className='ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] md:inline'>
                        Ctrl K
                    </kbd>
                </>
            }
            align='end'
            contentClassName='w-96 max-w-[calc(100vw-2rem)] p-0'
        >
            <Command shouldFilter={false}>
                <CommandInput
                    placeholder='Müşteri, blog veya not ara...'
                    value={query}
                    onValueChange={handleQueryChange}
                />
                <CommandList className='max-h-[min(28rem,60vh)]'>
                    {isLoading && (
                        <div className='flex justify-center py-6'>
                            <Spinner />
                        </div>
                    )}
                    {!isLoading && !trimmedQuery && (
                        <p className='py-6 text-center text-sm text-muted-foreground'>
                            Müşteri, blog ve notlarda aramak için yazın
                        </p>
                    )}
                    {!isLoading && trimmedQuery && !hasResults && (
                        <CommandEmpty>Sonuç bulunamadı</CommandEmpty>
                    )}

                    {!isLoading && trimmedQuery && results.customers.length > 0 && (
                        <CommandGroup heading='Müşteriler'>
                            {results.customers.map((customer) => (
                                <CommandItem
                                    key={customer.id}
                                    value={`/app/customers/${customer.id}`}
                                    onSelect={handleSelect}
                                >
                                    <Avatar size='sm'>
                                        <AvatarFallback>{getInitials(customer)}</AvatarFallback>
                                    </Avatar>
                                    <div className='grid flex-1 leading-tight'>
                                        <span className='truncate'>{customer.fullName}</span>
                                        <span className='truncate text-xs text-muted-foreground'>
                                            {customer.company ?? customer.email}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                            <ShowAllItem href={`/app/customers?q=${encodedQuery}`} label='Tüm müşteri sonuçları' onSelect={handleSelect} />
                        </CommandGroup>
                    )}

                    {!isLoading && trimmedQuery && results.posts.length > 0 && (
                        <>
                            {results.customers.length > 0 && <CommandSeparator />}
                            <CommandGroup heading='Bloglar'>
                                {results.posts.map((post) => (
                                    <CommandItem
                                        key={post.id}
                                        value={`/app/customers/${post.customerId}/blogs/${post.id}`}
                                        onSelect={handleSelect}
                                    >
                                        <IoNewspaper className='text-muted-foreground' />
                                        <div className='grid flex-1 leading-tight'>
                                            <span className='truncate'>{post.title}</span>
                                            <span className='truncate text-xs text-muted-foreground'>
                                                {post.customer?.fullName}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                                <ShowAllItem href={`/app/blogs?q=${encodedQuery}`} label='Tüm blog sonuçları' onSelect={handleSelect} />
                            </CommandGroup>
                        </>
                    )}

                    {!isLoading && trimmedQuery && results.notes.length > 0 && (
                        <>
                            {(results.customers.length > 0 || results.posts.length > 0) && <CommandSeparator />}
                            <CommandGroup heading='Notlar'>
                                {results.notes.map((note) => (
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
                                <ShowAllItem href={`/app/notes?q=${encodedQuery}`} label='Tüm not sonuçları' onSelect={handleSelect} />
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </Command>
        </ResponsivePopover>
    )

    function handleQueryChange(value: string) {
        setQuery(value)
        if (!value.trim()) {
            setResults(emptyResults)
            setIsLoading(false)
        }
    }

    function handleSelect(href: string) {
        setOpen(false)
        router.push(href)
    }

    function getInitials(customer: Customer) {
        return `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}

// Last item of a category: opens the category's list filtered with the same query
function ShowAllItem({
    href,
    label,
    onSelect
}: {
    href: string
    label: string
    onSelect: (href: string) => void
}) {
    return (
        <CommandItem value={href} onSelect={onSelect} className='text-muted-foreground'>
            <IoArrowForward />
            <span>{label}</span>
        </CommandItem>
    )
}
