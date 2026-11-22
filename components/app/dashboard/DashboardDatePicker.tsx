'use client'

import { useState, type TransitionStartFunction } from 'react'
import { usePathname } from 'next/navigation'
import { tr } from 'react-day-picker/locale'
import { IoCalendar, IoChevronDown } from 'react-icons/io5'
import { useSearchQuery } from 'use-search-query'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/format'
import { getStartOfToday, parseDateParam, toDateParam } from '@/lib/period'

// The day the dashboard is looked at, kept in ?date= (left out of the URL for today)
export default function DashboardDatePicker({
    date,
    isPending,
    startTransition
}: {
    date: string
    isPending: boolean
    startTransition: TransitionStartFunction
}) {
    const pathname = usePathname()
    const { routeToSearchParams } = useSearchQuery()
    const [open, setOpen] = useState(false)
    const selected = parseDateParam(date)
    const today = getStartOfToday()
    const isToday = toDateParam(selected) === toDateParam(today)

    return (
        <div className='flex flex-wrap items-center gap-2'>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    id='dashboard-date-trigger'
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    aria-label='Tarih seç'
                >
                    {isPending ? <Spinner /> : <IoCalendar />}
                    {formatDate(selected)}
                    <IoChevronDown />
                </PopoverTrigger>
                <PopoverContent align='start' className='w-auto p-0'>
                    <Calendar
                        mode='single'
                        locale={tr}
                        selected={selected}
                        defaultMonth={selected}
                        disabled={{ after: today }}
                        onSelect={handleSelect}
                    />
                </PopoverContent>
            </Popover>
            {!isToday && (
                <Button variant='ghost' size='sm' onClick={handleToday}>
                    Bugün
                </Button>
            )}
        </div>
    )

    function changeDate(value: Date) {
        const param = toDateParam(value)
        startTransition(function () {
            // Today is the default and is left out of the URL
            routeToSearchParams(pathname, { date: param === toDateParam(today) ? undefined : param })
        })
    }

    function handleSelect(value: Date | undefined) {
        setOpen(false)
        if (value) {
            changeDate(value)
        }
    }

    function handleToday() {
        changeDate(today)
    }
}
