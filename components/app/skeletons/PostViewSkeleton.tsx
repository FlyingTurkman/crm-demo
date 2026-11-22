import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const lineIds = ['line-1', 'line-2', 'line-3', 'line-4', 'line-5', 'line-6']

// Blog view page: title, status and content lines
export default function PostViewSkeleton() {
    return (
        <Card>
            <CardHeader className='flex flex-row items-start justify-between gap-2'>
                <div className='flex flex-1 flex-col gap-2'>
                    <Skeleton className='h-6 w-2/3' />
                    <Skeleton className='h-4 w-40' />
                </div>
                <div className='flex gap-2'>
                    <Skeleton className='h-9 w-32' />
                    <Skeleton className='h-9 w-24' />
                </div>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
                {lineIds.map((id) => (
                    <Skeleton key={id} className='h-4 w-full last:w-1/2' />
                ))}
            </CardContent>
        </Card>
    )
}
