import { Skeleton } from '@/components/ui/skeleton'
import { agendaDays } from '@/lib/src/constants'

const columnIds = Array.from({ length: agendaDays + 1 }, function (_, index) {
    return `column-${index}`
})
const rowIds = Array.from({ length: 8 }, function (_, index) {
    return `row-${index}`
})

// Agenda: title, toolbar and the week table (time column + one column per day)
export default function AgendaSkeleton() {
    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex items-center justify-between gap-2'>
                <div className='flex flex-col gap-2'>
                    <Skeleton className='h-8 w-28' />
                    <Skeleton className='h-4 w-56' />
                </div>
                <Skeleton className='h-9 w-32' />
            </div>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <Skeleton className='h-9 w-80' />
                <Skeleton className='h-9 w-72' />
            </div>
            <div className='overflow-hidden rounded-lg border'>
                {rowIds.map((rowId) => (
                    <div key={rowId} className='grid grid-cols-[4rem_repeat(7,1fr)] gap-2 border-b p-2 last:border-b-0'>
                        {columnIds.map((columnId) => (
                            <Skeleton key={columnId} className='h-10 w-full' />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
