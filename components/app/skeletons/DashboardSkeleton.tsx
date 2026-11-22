import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const tileIds = ['tile-1', 'tile-2', 'tile-3', 'tile-4']
const listIds = ['list-1', 'list-2', 'list-3']
const itemIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5']

// Dashboard (/app): stat tiles, two chart cards, "recently added" lists
export default function DashboardSkeleton() {
    return (
        <div className='container mx-auto flex flex-col gap-6 p-4'>
            <div className='flex flex-col gap-2'>
                <Skeleton className='h-8 w-44' />
                <Skeleton className='h-8 w-48' />
            </div>

            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                {tileIds.map((id) => (
                    <Card key={id} className='gap-2'>
                        <CardHeader className='flex flex-row items-center justify-between'>
                            <Skeleton className='h-4 w-24' />
                            <Skeleton className='size-5 rounded-full' />
                        </CardHeader>
                        <CardContent className='flex flex-col gap-2'>
                            <Skeleton className='h-9 w-20' />
                            <Skeleton className='h-4 w-28' />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
                <Card>
                    <CardHeader className='flex flex-col gap-2'>
                        <Skeleton className='h-5 w-32' />
                        <Skeleton className='h-4 w-64' />
                    </CardHeader>
                    <CardContent className='flex items-center justify-center'>
                        <Skeleton className='size-48 rounded-full' />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className='flex flex-col gap-2'>
                        <Skeleton className='h-5 w-48' />
                        <Skeleton className='h-4 w-56' />
                    </CardHeader>
                    <CardContent className='flex flex-col gap-3'>
                        {itemIds.map((id) => (
                            <div key={id} className='flex items-center gap-3'>
                                <Skeleton className='size-8 rounded-full' />
                                <Skeleton className='h-4 flex-1' />
                                <Skeleton className='h-4 w-8' />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className='flex flex-col gap-4'>
                <div className='flex items-center justify-between gap-2'>
                    <Skeleton className='h-6 w-44' />
                    <Skeleton className='h-9 w-40' />
                </div>
                <div className='grid gap-4 lg:grid-cols-3'>
                    {listIds.map((id) => (
                        <Card key={id}>
                            <CardHeader>
                                <Skeleton className='h-5 w-28' />
                            </CardHeader>
                            <CardContent className='flex flex-col gap-3'>
                                {itemIds.slice(0, 3).map((itemId) => (
                                    <div key={itemId} className='flex flex-col gap-1'>
                                        <Skeleton className='h-4 w-3/4' />
                                        <Skeleton className='h-3 w-1/2' />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
