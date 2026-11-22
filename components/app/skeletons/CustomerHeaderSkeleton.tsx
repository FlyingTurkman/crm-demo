import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Customer detail layout (avatar, name, menus) before the customer has loaded
export default function CustomerHeaderSkeleton({ children }: { children: ReactNode }) {
    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-center gap-3'>
                    <Skeleton className='size-10 rounded-full' />
                    <div className='flex flex-col gap-2'>
                        <Skeleton className='h-6 w-40' />
                        <Skeleton className='h-4 w-28' />
                    </div>
                </div>
                <div className='flex gap-2'>
                    <Skeleton className='h-9 w-24' />
                    <Skeleton className='h-9 w-24' />
                    <Skeleton className='h-9 w-24' />
                </div>
            </div>
            {children}
        </div>
    )
}
