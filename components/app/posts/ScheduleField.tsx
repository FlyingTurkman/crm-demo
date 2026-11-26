'use client'

import DueDatePicker from '@/components/app/posts/DueDatePicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { agendaDefaultStartHour, scheduleStepMinutes } from '@/lib/src/constants'

// 00:00, 00:30, ... 23:30
const timeLabels: Record<string, string> = {}
for (let minutes = 0; minutes < 24 * 60; minutes += scheduleStepMinutes) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    timeLabels[time] = time
}
const defaultTime = `${String(agendaDefaultStartHour + 2).padStart(2, '0')}:00`

// Publish time of a post as YYYY-MM-DDTHH:mm ('' when there is none): a day picker plus a time select
export default function ScheduleField({
    id,
    value,
    onChange
}: {
    id?: string
    value: string
    onChange: (value: string) => void
}) {
    const [day, time] = value ? value.split('T') : ['', '']
    // A time that isn't on the step (e.g. sent from the API) is still shown
    const items = time && !(time in timeLabels) ? { ...timeLabels, [time]: time } : timeLabels

    return (
        <div className='grid grid-cols-[1fr_7rem] gap-2'>
            <DueDatePicker id={id} value={day} onChange={handleDayChange} />
            <Select
                items={items}
                value={time || null}
                disabled={!day}
                onValueChange={function (selected) {
                    if (selected && day) {
                        onChange(`${day}T${selected}`)
                    }
                }}
            >
                <SelectTrigger className='w-full' aria-label='Yayın saati'>
                    <SelectValue placeholder='Saat' />
                </SelectTrigger>
                <SelectContent>
                    {Object.keys(items).map((item) => (
                        <SelectItem key={item} value={item}>
                            {item}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )

    function handleDayChange(nextDay: string) {
        // Clearing the day clears the whole schedule; a new day keeps the chosen time
        onChange(nextDay ? `${nextDay}T${time || defaultTime}` : '')
    }
}
