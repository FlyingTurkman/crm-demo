'use client'

import { useEffect, useState, type TransitionStartFunction } from 'react'
import { usePathname } from 'next/navigation'
import { IoClose, IoSearch } from 'react-icons/io5'
import { useSearchQuery } from 'use-search-query'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { maxSearchLength, searchDebounceMs } from '@/lib/src/constants'

export type ListFilterSelect = {
    // Search param name, e.g. 'status' → ?status=
    param: string
    value: string
    // Value that is left out of the URL (e.g. 'all', 'updated')
    defaultValue: string
    items: Record<string, string>
    label: string
    className?: string
}

// Search box + select filters of a list. Everything lives in the URL
// (?q=&<param>=&page=) and is written with use-search-query.
export default function ListFilters({
    query: urlQuery,
    placeholder,
    selects,
    isPending,
    startTransition
}: {
    query: string
    placeholder: string
    selects: ListFilterSelect[]
    isPending: boolean
    startTransition: TransitionStartFunction
}) {
    const pathname = usePathname()
    const { routeToSearchParams } = useSearchQuery()
    const [query, setQuery] = useState(urlQuery)
    // Last value this input wrote to the URL, to tell our own updates apart from external ones
    const [pushedQuery, setPushedQuery] = useState(urlQuery)
    const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery)
    const hasFilters = Boolean(urlQuery) || selects.some(function (select) {
        return select.value !== select.defaultValue
    })

    // URL changed from outside (back button, reset): show its value in the input
    if (urlQuery !== previousUrlQuery) {
        setPreviousUrlQuery(urlQuery)
        if (urlQuery !== pushedQuery) {
            setQuery(urlQuery)
            setPushedQuery(urlQuery)
        }
    }

    // Debounce: write the search text to the URL after the user stops typing
    useEffect(function () {
        const trimmed = query.trim()
        if (trimmed === pushedQuery) {
            return
        }

        const timeout = setTimeout(function () {
            setPushedQuery(trimmed)
            startTransition(function () {
                // A new search starts from the first page
                routeToSearchParams(pathname, { q: trimmed, page: undefined })
            })
        }, searchDebounceMs)

        return function () {
            clearTimeout(timeout)
        }
    }, [query, pushedQuery, pathname, routeToSearchParams, startTransition])

    return (
        <div className='flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center'>
            <InputGroup className='lg:max-w-sm'>
                <InputGroupAddon>
                    {isPending ? <Spinner /> : <IoSearch />}
                </InputGroupAddon>
                <InputGroupInput
                    placeholder={placeholder}
                    aria-label={placeholder}
                    maxLength={maxSearchLength}
                    value={query}
                    onChange={handleQueryChange}
                />
            </InputGroup>

            {selects.map((select) => (
                <Select
                    key={select.param}
                    items={select.items}
                    value={select.value}
                    onValueChange={function (value) {
                        handleSelectChange(select, value)
                    }}
                >
                    <SelectTrigger className={cn('w-full lg:w-52', select.className)} aria-label={select.label}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(select.items).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}

            {hasFilters && (
                <Button variant='ghost' onClick={handleReset}>
                    <IoClose /> Filtreleri Temizle
                </Button>
            )}
        </div>
    )

    function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value)
    }

    function handleSelectChange(select: ListFilterSelect, value: string | null) {
        startTransition(function () {
            // The default value is left out of the URL, a new filter starts from the first page
            routeToSearchParams(pathname, {
                [select.param]: !value || value === select.defaultValue ? undefined : value,
                page: undefined,
            })
        })
    }

    function handleReset() {
        setQuery('')
        setPushedQuery('')
        startTransition(function () {
            routeToSearchParams(pathname, {}, { reset: true })
        })
    }
}
