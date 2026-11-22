import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const detailIds = ['detail-1', 'detail-2', 'detail-3', 'detail-4']
const statIds = ['stat-1', 'stat-2']

// Customer detail page: contact details, counts and the blog status chart
export default function CustomerOverviewSkeleton() {
    return (
        <div className='grid gap-4 lg:grid-cols-3'>
            <Card className='lg:col-span-1'>
                <CardHeader>
                    <Skeleton className='h-5 w-32' />
                </CardHeader>
                <CardContent className='grid gap-3'>
                    {detailIds.map((id) => (
                        <div key={id} className='grid gap-1'>
                            <Skeleton className='h-3 w-16' />
                            <Skeleton className='h-4 w-40' />
                        </div>
                    ))}
                </CardContent>
            </Card>
            <div className='grid content-start gap-4 sm:grid-cols-2 lg:col-span-2'>
                {statIds.map((id) => (
                    <Card key={id}>
                        <CardHeader className='flex flex-col gap-2'>
                            <Skeleton className='h-4 w-24' />
                            <Skeleton className='h-9 w-16' />
                        </CardHeader>
                    </Card>
                ))}
                <Card className='sm:col-span-2'>
                    <CardHeader>
                        <Skeleton className='h-5 w-36' />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className='h-48 w-full' />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
