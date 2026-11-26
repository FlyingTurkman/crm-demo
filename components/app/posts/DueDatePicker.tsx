'use client'

import { useState } from 'react'
import { tr } from 'react-day-picker/locale'
import { IoCalendar, IoClose } from 'react-icons/io5'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { formatDate } from '@/lib/format'
import { parseDayValue, toDateParam } from '@/lib/period'
import { cn } from '@/lib/utils'

// Delivery day of a post as YYYY-MM-DD ('' when there is none)
export default function DueDatePicker({
    id,
    value,
    onChange
}: {
    id?: string
    value: string
    onChange: (value: string) => void
}) {
    const [open, setOpen] = useState(false)
    const selected = value ? parseDayValue(value) ?? undefined : undefined

    return (
        <div className='flex items-center gap-1'>
            <ResponsivePopover
                open={open}
                onOpenChange={setOpen}
                title='Teslim tarihi seç'
                triggerId={id}
                triggerLabel='Teslim tarihi seç'
                triggerClassName={cn(buttonVariants({ variant: 'outline' }), 'flex-1 justify-start font-normal')}
                trigger={
                    <>
                        <IoCalendar />
                        {selected ? formatDate(selected) : <span className='text-muted-foreground'>Tarih seçin</span>}
                    </>
                }
                contentClassName='w-auto p-0'
            >
                <Calendar
                    className='mx-auto md:mx-0'
                    mode='single'
                    locale={tr}
                    selected={selected}
                    defaultMonth={selected}
                    onSelect={handleSelect}
                />
            </ResponsivePopover>
            {selected && (
                <Button type='button' variant='ghost' size='icon' aria-label='Teslim tarihini kaldır' onClick={handleClear}>
                    <IoClose />
                </Button>
            )}
        </div>
    )

    function handleSelect(date: Date | undefined) {
        setOpen(false)
        onChange(date ? toDateParam(date) : '')
    }

    function handleClear() {
        onChange('')
    }
}
