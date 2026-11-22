import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const cardIds = ['card-1', 'card-2', 'card-3', 'card-4']

// Profile page: account summary and four cards (profile, password, API token, sessions)
export default function ProfileSkeleton() {
    return (
        <div className='container mx-auto flex max-w-4xl flex-col gap-6 p-4'>
            <Skeleton className='h-8 w-32' />
            <Card>
                <CardContent className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                    <Skeleton className='size-16 rounded-full' />
                    <div className='flex flex-col gap-2'>
                        <Skeleton className='h-6 w-48' />
                        <Skeleton className='h-4 w-40' />
                        <Skeleton className='h-4 w-52' />
                    </div>
                </CardContent>
            </Card>
            <div className='grid gap-6 lg:grid-cols-2'>
                {cardIds.map((id) => (
                    <Card key={id}>
                        <CardHeader className='flex flex-col gap-2'>
                            <Skeleton className='h-5 w-32' />
                            <Skeleton className='h-4 w-full' />
                        </CardHeader>
                        <CardContent className='flex flex-col gap-4'>
                            <Skeleton className='h-9 w-full' />
                            <Skeleton className='h-9 w-full' />
                            <Skeleton className='h-9 w-32' />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
