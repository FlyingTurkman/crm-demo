import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const rowIds = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5', 'row-6', 'row-7', 'row-8']
const cardIds = ['card-1', 'card-2', 'card-3', 'card-4']

// List pages: title + "add" button, filters, table (or cards) and pagination.
// `withTitle` is false inside the customer detail layout, its lists start with a count line.
export default function ListSkeleton({
    variant = 'table',
    withTitle = true,
    className
}: {
    variant?: 'table' | 'cards'
    withTitle?: boolean
    className?: string
}) {
    return (
        <div className={cn('flex flex-col gap-4', className)}>
            <div className='flex flex-row items-center justify-between gap-2'>
                <div className='flex flex-col gap-2'>
                    {withTitle && <Skeleton className='h-8 w-40' />}
                    <Skeleton className='h-4 w-32' />
                </div>
                <Skeleton className='h-9 w-28' />
            </div>

            <div className='flex flex-wrap gap-2'>
                <Skeleton className='h-9 w-full sm:w-64' />
                <Skeleton className='h-9 w-36' />
                <Skeleton className='h-9 w-36' />
            </div>

            {variant === 'table' ? (
                <div className='flex flex-col rounded-lg border'>
                    <div className='flex gap-4 border-b p-3'>
                        <Skeleton className='h-4 w-1/4' />
                        <Skeleton className='h-4 w-1/4' />
                        <Skeleton className='hidden h-4 w-1/6 md:block' />
                        <Skeleton className='ml-auto h-4 w-12' />
                    </div>
                    {rowIds.map((id) => (
                        <div key={id} className='flex items-center gap-4 border-b p-3 last:border-b-0'>
                            <div className='flex w-1/4 items-center gap-2'>
                                <Skeleton className='size-8 shrink-0 rounded-full' />
                                <Skeleton className='h-4 flex-1' />
                            </div>
                            <Skeleton className='h-4 w-1/4' />
                            <Skeleton className='hidden h-4 w-1/6 md:block' />
                            <Skeleton className='ml-auto h-4 w-12' />
                        </div>
                    ))}
                </div>
            ) : (
                <div className='flex flex-col gap-4'>
                    {cardIds.map((id) => (
                        <Card key={id}>
                            <CardHeader className='flex flex-row items-start justify-between gap-2'>
                                <div className='flex flex-1 flex-col gap-2'>
                                    <Skeleton className='h-5 w-1/2' />
                                    <Skeleton className='h-4 w-32' />
                                </div>
                                <Skeleton className='h-6 w-20 rounded-full' />
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2'>
                                <Skeleton className='h-4 w-full' />
                                <Skeleton className='h-4 w-2/3' />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className='flex justify-center gap-2'>
                <Skeleton className='h-9 w-20' />
                <Skeleton className='size-9' />
                <Skeleton className='size-9' />
                <Skeleton className='h-9 w-20' />
            </div>
        </div>
    )
}
