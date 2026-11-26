'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { IoAdd, IoInformationCircle } from 'react-icons/io5'
import AgendaTable from '@/components/app/agenda/AgendaTable'
import AgendaToolbar from '@/components/app/agenda/AgendaToolbar'
import { buttonVariants } from '@/components/ui/button'
import { parseDayValue } from '@/lib/period'
import { pageLimit } from '@/lib/src/constants'
import { cn } from '@/lib/utils'
import type { PublicUserDto } from '@/dtos/userDTO'
import type { Post } from '@/types'

export default function AgendaPageClient({
    start,
    assignee,
    assigneeUser,
    scheduledPosts,
    duePosts,
    isTruncated,
    errorMessage
}: {
    // First day of the week (YYYY-MM-DD)
    start: string
    // ?assignee= filter: 'me', 'none' or a user id; everyone when undefined
    assignee?: string
    // The user of a user id filter (for its name)
    assigneeUser?: PublicUserDto | null
    scheduledPosts: Post[]
    duePosts: Post[]
    isTruncated: boolean
    errorMessage?: string
}) {
    // Shared by the week buttons and the date picker: dims the table while the next week loads
    const [isPending, startTransition] = useTransition()
    const startDate = parseDayValue(start) ?? new Date()

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <div className='min-w-0'>
                    <h1 className='text-2xl font-semibold'>Ajanda</h1>
                    <p className='text-sm text-muted-foreground'>
                        {scheduledPosts.length === 0
                            ? 'Bu hafta zamanlanmış içerik yok'
                            : `Bu hafta ${scheduledPosts.length} zamanlanmış içerik, ${duePosts.length} teslim`}
                    </p>
                </div>
                <Link href='/app/blogs/add' className={cn(buttonVariants(), 'shrink-0')}>
                    <IoAdd /> Yeni İçerik
                </Link>
            </div>

            <AgendaToolbar
                start={startDate}
                assignee={assignee}
                assigneeUser={assigneeUser}
                isPending={isPending}
                startTransition={startTransition}
            />

            {errorMessage && (
                <p className='text-sm text-destructive'>{errorMessage}</p>
            )}
            {isTruncated && (
                <p className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <IoInformationCircle aria-hidden />
                    Bu hafta için en fazla {pageLimit} içerik gösteriliyor.
                </p>
            )}

            <div className={cn('transition-opacity', isPending && 'opacity-60')}>
                <AgendaTable
                    start={startDate}
                    scheduledPosts={scheduledPosts}
                    duePosts={duePosts}
                />
            </div>
        </div>
    )

}
