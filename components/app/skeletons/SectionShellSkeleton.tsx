import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const itemIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7', 'item-8']

// Layout of a section (customers, blogs, notes, admin) before it has loaded:
// sidebar (desktop only, it is a Sheet on phones) and the bar with toggle, search and breadcrumb.
export default function SectionShellSkeleton({ children }: { children: ReactNode }) {
    return (
        <div className='flex min-h-[calc(100svh-3.5rem)]'>
            <aside className='hidden w-64 shrink-0 flex-col gap-4 border-r bg-sidebar p-2 md:flex'>
                <div className='flex items-center gap-2 p-2'>
                    <Skeleton className='size-8 rounded-lg' />
                    <Skeleton className='h-4 w-24' />
                </div>
                <div className='flex flex-col gap-2 px-2'>
                    <Skeleton className='h-3 w-20' />
                    <Skeleton className='h-6 w-full' />
                    <Skeleton className='h-6 w-full' />
                </div>
                <div className='flex flex-col gap-3 px-2'>
                    <Skeleton className='h-3 w-24' />
                    {itemIds.map((id) => (
                        <div key={id} className='flex items-center gap-2'>
                            <Skeleton className='size-8 shrink-0 rounded-full' />
                            <div className='flex flex-1 flex-col gap-1'>
                                <Skeleton className='h-3 w-full' />
                                <Skeleton className='h-3 w-2/3' />
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
            <div className='flex min-w-0 flex-1 flex-col'>
                <div className='flex flex-wrap items-center gap-2 border-b p-2'>
                    <Skeleton className='size-7' />
                    <Skeleton className='h-8 w-32' />
                    <Skeleton className='h-4 w-full md:w-48' />
                </div>
                {children}
            </div>
        </div>
    )
}
