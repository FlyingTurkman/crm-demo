import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const fieldIds = ['field-1', 'field-2', 'field-3', 'field-4']

// Add / edit forms. `editor`: blog and note forms with the rich text editor (full width),
// otherwise a centered card with fields (customer, user).
export default function FormSkeleton({
    editor = false,
    className
}: {
    editor?: boolean
    className?: string
}) {
    return (
        <div className={cn('flex justify-center', className)}>
            <Card className={cn('w-full', !editor && 'max-w-2xl')}>
                <CardHeader className='flex flex-col gap-2'>
                    <Skeleton className='h-5 w-40' />
                    <Skeleton className='h-4 w-64' />
                </CardHeader>
                <CardContent className='flex flex-col gap-6'>
                    {editor ? (
                        <>
                            <div className='grid gap-4 sm:grid-cols-[1fr_12rem]'>
                                <FieldSkeleton />
                                <FieldSkeleton />
                            </div>
                            <div className='flex flex-col gap-2'>
                                <Skeleton className='h-4 w-20' />
                                <Skeleton className='h-10 w-full' />
                                <Skeleton className='h-72 w-full' />
                            </div>
                        </>
                    ) : (
                        <div className='grid gap-4 sm:grid-cols-2'>
                            {fieldIds.map((id) => (
                                <FieldSkeleton key={id} />
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter className='mt-4 justify-end gap-2'>
                    <Skeleton className='h-9 w-20' />
                    <Skeleton className='h-9 w-24' />
                </CardFooter>
            </Card>
        </div>
    )
}

function FieldSkeleton() {
    return (
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-9 w-full' />
        </div>
    )
}
