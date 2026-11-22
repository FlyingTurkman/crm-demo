'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IoSearch } from 'react-icons/io5'
import { searchUsers } from '@/actions/user'
import UserRoleBadge from '@/components/app/admin/UserRoleBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import type { ManagedUserDto } from '@/dtos/userDTO'
import { searchDebounceMs } from '@/lib/src/constants'

export default function UserSearchBar() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [users, setUsers] = useState<ManagedUserDto[]>([])
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
            const result = await searchUsers({ query: trimmedQuery })
            // Ignore responses of older queries
            if (isCancelled) {
                return
            }
            setUsers(result.users ?? [])
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
                Kullanıcı ara <IoSearch />
            </PopoverTrigger>
            <PopoverContent align='start' className='w-80 max-w-[calc(100vw-2rem)] p-0'>
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder='Ad veya email...'
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
                            <CommandEmpty>Kullanıcı bulunamadı</CommandEmpty>
                        )}
                        {!isLoading && trimmedQuery && users.map((user) => (
                            <CommandItem
                                key={user.id}
                                value={user.id}
                                onSelect={handleSelect}
                            >
                                <Avatar size='sm'>
                                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                </Avatar>
                                <div className='grid flex-1 leading-tight'>
                                    <span className='truncate'>{user.fullName}</span>
                                    <span className='truncate text-xs text-muted-foreground'>{user.email}</span>
                                </div>
                                <UserRoleBadge role={user.role} />
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
            setUsers([])
            setIsLoading(false)
        }
    }

    function handleSelect(userId: string) {
        setOpen(false)
        router.push(`/app/admin/${userId}/edit`)
    }

    function getInitials(user: ManagedUserDto) {
        return `${user.name.charAt(0)}${user.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
