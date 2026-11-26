'use client'

import { useEffect, useState, type TransitionStartFunction } from 'react'
import { usePathname } from 'next/navigation'
import { IoCheckmark, IoPeople, IoPerson, IoPersonRemove, IoSearch } from 'react-icons/io5'
import { useSearchQuery } from 'use-search-query'
import { searchPostAssignees } from '@/actions/post'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { maxSearchLength, postAssigneeFilterLabels, searchDebounceMs } from '@/lib/src/constants'
import type { PublicUserDto } from '@/dtos/userDTO'

const fixedOptions = [
    { value: 'all', label: postAssigneeFilterLabels.all, icon: IoPeople },
    { value: 'me', label: postAssigneeFilterLabels.me, icon: IoPerson },
    { value: 'none', label: postAssigneeFilterLabels.none, icon: IoPersonRemove },
]

// Whose work the agenda shows, kept in ?assignee= ('me', 'none' or a user id; left out for everyone).
// A search bar: the fixed options on top, users found on the server (by name) below.
export default function AgendaAssigneeFilter({
    value,
    selectedUser,
    startTransition
}: {
    value?: string
    // The user of a user id filter, to show its name on the trigger
    selectedUser?: PublicUserDto | null
    startTransition: TransitionStartFunction
}) {
    const pathname = usePathname()
    const { routeToSearchParams } = useSearchQuery()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [users, setUsers] = useState<PublicUserDto[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const trimmedQuery = query.trim()
    const current = value ?? 'all'
    const triggerLabel = getTriggerLabel()

    // Debounce: search only after the user stops typing for searchDebounceMs
    useEffect(function () {
        if (!trimmedQuery) {
            return
        }

        let isCancelled = false
        const timeout = setTimeout(async function () {
            setIsLoading(true)
            const result = await searchPostAssignees({ query: trimmedQuery })
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
        // Desktop: popover, mobile: drawer from the bottom of the screen
        <ResponsivePopover
            modal
            open={open}
            onOpenChange={handleOpenChange}
            title='Sorumluya göre filtrele'
            triggerId='agenda-assignee-trigger'
            triggerLabel={`Sorumlu: ${triggerLabel}`}
            triggerClassName={cn(buttonVariants({ variant: 'secondary' }), 'w-full justify-between sm:w-56')}
            trigger={
                <>
                    <span className='truncate'>{triggerLabel}</span>
                    <IoSearch />
                </>
            }
            align='end'
            contentClassName='w-72 max-w-[calc(100vw-2rem)] p-0'
        >
            <Command shouldFilter={false}>
                <CommandInput
                    placeholder='Kullanıcı ara...'
                    maxLength={maxSearchLength}
                    value={query}
                    onValueChange={handleQueryChange}
                />
                <CommandList>
                    {!trimmedQuery && (
                        <CommandGroup>
                            {fixedOptions.map((option) => (
                                <CommandItem key={option.value} value={option.value} onSelect={handleSelect}>
                                    <option.icon className='text-muted-foreground' />
                                    <span className='flex-1'>{option.label}</span>
                                    {current === option.value && <IoCheckmark />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {!trimmedQuery && selectedUser && (
                        <>
                            <CommandSeparator />
                            <CommandGroup heading='Seçili kullanıcı'>
                                <CommandItem value={selectedUser.id} onSelect={handleSelect}>
                                    <UserAvatar user={selectedUser} />
                                    <span className='flex-1 truncate'>{selectedUser.fullName}</span>
                                    <IoCheckmark />
                                </CommandItem>
                            </CommandGroup>
                        </>
                    )}
                    {!trimmedQuery && (
                        <p className='px-3 py-2 text-xs text-muted-foreground'>Bir kişinin işlerini görmek için adını yazın</p>
                    )}

                    {isLoading && (
                        <div className='flex justify-center py-6'>
                            <Spinner />
                        </div>
                    )}
                    {!isLoading && trimmedQuery && (
                        <CommandEmpty>Kullanıcı bulunamadı</CommandEmpty>
                    )}
                    {!isLoading && trimmedQuery && users.length > 0 && (
                        <CommandGroup heading='Kullanıcılar'>
                            {users.map((user) => (
                                <CommandItem key={user.id} value={user.id} onSelect={handleSelect}>
                                    <UserAvatar user={user} />
                                    <span className='flex-1 truncate'>{user.fullName}</span>
                                    {current === user.id && <IoCheckmark />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </Command>
        </ResponsivePopover>
    )

    function getTriggerLabel() {
        if (current === 'me' || current === 'none' || current === 'all') {
            return postAssigneeFilterLabels[current]
        }
        return selectedUser?.fullName ?? 'Bilinmeyen kullanıcı'
    }

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen)
        // Start clean next time
        if (!nextOpen) {
            setQuery('')
            setUsers([])
            setIsLoading(false)
        }
    }

    function handleQueryChange(nextQuery: string) {
        setQuery(nextQuery)
        if (!nextQuery.trim()) {
            setUsers([])
            setIsLoading(false)
        }
    }

    function handleSelect(selected: string) {
        handleOpenChange(false)
        startTransition(function () {
            // Everyone is the default and is left out of the URL; the week stays as it is
            routeToSearchParams(pathname, { assignee: selected === 'all' ? undefined : selected })
        })
    }
}

function UserAvatar({ user }: { user: PublicUserDto }) {
    return (
        <Avatar size='sm'>
            <AvatarFallback>{`${user.name.charAt(0)}${user.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')}</AvatarFallback>
        </Avatar>
    )
}
