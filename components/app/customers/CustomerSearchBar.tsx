'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IoSearch } from 'react-icons/io5'
import { searchCustomers } from '@/actions/customer'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { searchDebounceMs } from '@/lib/src/constants'
import type { Customer } from '@/types'

export default function CustomerSearchBar() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [customers, setCustomers] = useState<Customer[]>([])
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
            const result = await searchCustomers({ query: trimmedQuery })
            // Ignore responses of older queries
            if (isCancelled) {
                return
            }
            setCustomers(result.customers ?? [])
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
            title='Müşteri ara'
            triggerClassName={buttonVariants({ variant: 'secondary' })}
            trigger={<>Müşteri ara <IoSearch /></>}
            contentClassName='w-80 max-w-[calc(100vw-2rem)] p-0'
        >
            <Command shouldFilter={false}>
                <CommandInput
                    placeholder='Ad, email veya telefon...'
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
                        <CommandEmpty>Müşteri bulunamadı</CommandEmpty>
                    )}
                    {!isLoading && trimmedQuery && customers.map((customer) => (
                        <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={handleSelect}
                        >
                            <Avatar size='sm'>
                                <AvatarFallback>{getInitials(customer)}</AvatarFallback>
                            </Avatar>
                            <div className='grid flex-1 leading-tight'>
                                <span className='truncate'>{customer.fullName}</span>
                                <span className='truncate text-xs text-muted-foreground'>
                                    {customer.email}{customer.phone ? ` · ${customer.phone}` : ''}
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
            setCustomers([])
            setIsLoading(false)
        }
    }

    function handleSelect(customerId: string) {
        setOpen(false)
        router.push(`/app/customers/${customerId}`)
    }

    function getInitials(customer: Customer) {
        return `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
