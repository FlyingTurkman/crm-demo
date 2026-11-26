'use client'

import { useState, type TransitionStartFunction } from 'react'
import { usePathname } from 'next/navigation'
import { tr } from 'react-day-picker/locale'
import { IoCalendar, IoChevronBack, IoChevronDown, IoChevronForward } from 'react-icons/io5'
import { useSearchQuery } from 'use-search-query'
import AgendaAssigneeFilter from '@/components/app/agenda/AgendaAssigneeFilter'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/format'
import { addDays, getStartOfToday, toDateParam } from '@/lib/period'
import { agendaDays } from '@/lib/src/constants'
import type { PublicUserDto } from '@/dtos/userDTO'

// Week of the agenda, kept in ?date= (left out for today), and whose work is shown
export default function AgendaToolbar({
    start,
    assignee,
    assigneeUser,
    isPending,
    startTransition
}: {
    start: Date
    assignee?: string
    assigneeUser?: PublicUserDto | null
    isPending: boolean
    startTransition: TransitionStartFunction
}) {
    const pathname = usePathname()
    const { routeToSearchParams } = useSearchQuery()
    const [open, setOpen] = useState(false)
    const today = getStartOfToday()
    const end = addDays(start, agendaDays - 1)
    const isThisWeek = toDateParam(start) === toDateParam(today)

    return (
        <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
            <div className='flex flex-wrap items-center gap-2'>
                <Button variant='outline' size='icon' aria-label='Önceki hafta' onClick={handlePrevious}>
                    <IoChevronBack />
                </Button>
                <ResponsivePopover
                    open={open}
                    onOpenChange={setOpen}
                    title='Başlangıç günü seç'
                    triggerId='agenda-date-trigger'
                    triggerLabel='Başlangıç günü seç'
                    triggerClassName={buttonVariants({ variant: 'outline' })}
                    trigger={
                        <>
                            {isPending ? <Spinner /> : <IoCalendar />}
                            {formatDate(start)} – {formatDate(end)}
                            <IoChevronDown />
                        </>
                    }
                    contentClassName='w-auto p-0'
                >
                    <Calendar
                        className='mx-auto md:mx-0'
                        mode='single'
                        locale={tr}
                        selected={start}
                        defaultMonth={start}
                        onSelect={handleSelect}
                    />
                </ResponsivePopover>
                <Button variant='outline' size='icon' aria-label='Sonraki hafta' onClick={handleNext}>
                    <IoChevronForward />
                </Button>
                {!isThisWeek && (
                    <Button variant='ghost' onClick={handleToday}>
                        Bugün
                    </Button>
                )}
            </div>
            <AgendaAssigneeFilter value={assignee} selectedUser={assigneeUser} startTransition={startTransition} />
        </div>
    )

    function goTo(day: Date) {
        const param = toDateParam(day)
        startTransition(function () {
            // Today is the default and is left out of the URL
            routeToSearchParams(pathname, { date: param === toDateParam(today) ? undefined : param })
        })
    }

    function handleSelect(day: Date | undefined) {
        setOpen(false)
        if (day) {
            goTo(day)
        }
    }

    function handlePrevious() {
        goTo(addDays(start, -agendaDays))
    }

    function handleNext() {
        goTo(addDays(start, agendaDays))
    }

    function handleToday() {
        goTo(today)
    }

}
