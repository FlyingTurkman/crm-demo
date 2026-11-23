'use client'

import { useEffect, useState } from 'react'
import { IoChevronDown, IoSearch } from 'react-icons/io5'
import { searchCustomers } from '@/actions/customer'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { searchDebounceMs } from '@/lib/src/constants'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types'

// Form field that picks a customer with the search bar pattern (Popover + Command, debounced
// server search). Unlike CustomerSearchBar it doesn't navigate: the selection goes to onChange.
export default function CustomerPicker({
    id,
    value,
    onChange,
    isInvalid = false,
}: {
    id?: string
    value: Customer | null
    onChange: (customer: Customer) => void
    isInvalid?: boolean
}) {
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
            title='Müşteri seç'
            triggerId={id}
            isInvalid={isInvalid}
            triggerClassName={cn(
                buttonVariants({ variant: 'secondary' }),
                'h-auto min-h-9 w-full justify-between py-1.5',
                isInvalid && 'ring-2 ring-destructive/40'
            )}
            trigger={renderTrigger()}
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
                    {!isLoading && !trimmedQuery && (
                        <p className='py-6 text-center text-sm text-muted-foreground'>
                            Aramak için yazmaya başlayın
                        </p>
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

    function renderTrigger() {
        return (
            <>
                {value ? (
                    <span className='flex min-w-0 items-center gap-2'>
                        <Avatar size='sm'>
                            <AvatarFallback>{getInitials(value)}</AvatarFallback>
                        </Avatar>
                        <span className='grid min-w-0 text-left leading-tight'>
                            <span className='truncate'>{value.fullName}</span>
                            <span className='truncate text-xs font-normal text-muted-foreground'>{value.email}</span>
                        </span>
                    </span>
                ) : (
                    <span className='flex items-center gap-2 text-muted-foreground'>
                        <IoSearch /> Müşteri ara ve seç
                    </span>
                )}
                <IoChevronDown className='shrink-0 text-muted-foreground' />
            </>
        )
    }

    function handleQueryChange(text: string) {
        setQuery(text)
        if (!text.trim()) {
            setCustomers([])
            setIsLoading(false)
        }
    }

    function handleSelect(customerId: string) {
        const customer = customers.find(function (item) {
            return item.id === customerId
        })
        if (customer) {
            onChange(customer)
        }
        setOpen(false)
    }

    function getInitials(customer: Customer) {
        return `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
