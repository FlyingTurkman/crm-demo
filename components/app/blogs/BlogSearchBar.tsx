'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IoNewspaper, IoSearch } from 'react-icons/io5'
import { searchPosts } from '@/actions/post'
import { buttonVariants } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { searchDebounceMs } from '@/lib/src/constants'
import type { Post } from '@/types'

export default function BlogSearchBar() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [posts, setPosts] = useState<Post[]>([])
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
            const result = await searchPosts({ query: trimmedQuery })
            // Ignore responses of older queries
            if (isCancelled) {
                return
            }
            setPosts(result.posts ?? [])
            setIsLoading(false)
        }, searchDebounceMs)

        return function () {
            isCancelled = true
            clearTimeout(timeout)
        }
    }, [trimmedQuery])

    return (
        <Popover modal open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={buttonVariants({ variant: 'secondary' })}>
                Blog ara <IoSearch />
            </PopoverTrigger>
            <PopoverContent align='start' className='w-80 max-w-[calc(100vw-2rem)] p-0'>
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder='Başlık veya içerik...'
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
                            <CommandEmpty>Blog bulunamadı</CommandEmpty>
                        )}
                        {!isLoading && trimmedQuery && posts.map((post) => (
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
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )

    function handleQueryChange(value: string) {
        setQuery(value)
        if (!value.trim()) {
            setPosts([])
            setIsLoading(false)
        }
    }

    function handleSelect(href: string) {
        setOpen(false)
        router.push(href)
    }
}
