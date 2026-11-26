'use client'

import Link from 'next/link'
import { IoAdd } from 'react-icons/io5'
import AgendaPostPopover from '@/components/app/agenda/AgendaPostPopover'
import PostPlatformBadges from '@/components/app/posts/PostPlatformBadges'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { addDays, getStartOfToday, isPostOverdue, toDateParam } from '@/lib/period'
import { agendaDays, agendaDefaultEndHour, agendaDefaultStartHour } from '@/lib/src/constants'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

const dayIndexes = Array.from({ length: agendaDays }, function (_, index) {
    return index
})

function formatSlot(minutes: number) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

// Hour rows of the week: from the hour of the first post to the hour of the last one.
// A week without scheduled posts shows the default working hours, so "+" still works.
function getHourRange(posts: Post[]) {
    if (posts.length === 0) {
        return { firstHour: agendaDefaultStartHour, lastHour: agendaDefaultEndHour - 1 }
    }
    const hours = posts.map((post) => new Date(post.scheduledAt as Date).getHours())
    return { firstHour: Math.min(...hours), lastHour: Math.max(...hours) }
}

// A week of scheduled posts: one column per day, one row per hour between the first and the last
// post of the week. The first row holds the posts due that day. Every cell has a "+" that opens a
// new post with that publish time.
export default function AgendaTable({
    start,
    scheduledPosts,
    duePosts
}: {
    start: Date
    scheduledPosts: Post[]
    duePosts: Post[]
}) {
    const days = dayIndexes.map((index) => addDays(start, index))
    const todayKey = toDateParam(getStartOfToday())
    const { firstHour, lastHour } = getHourRange(scheduledPosts)
    const slots: number[] = []
    for (let hour = firstHour; hour <= lastHour; hour++) {
        slots.push(hour * 60)
    }

    return (
        // The only scroll container: shadcn's Table wraps the table in its own `overflow-x-auto` div,
        // which would become the sticky header's scroll box (and never scroll vertically), so it is
        // made overflow-visible here. Then the day header sticks to the top and the hour column to the left.
        <div className='max-h-[calc(100vh-12rem)] overflow-auto rounded-lg border [&>[data-slot=table-container]]:overflow-visible'>
            <Table className='min-w-4xl table-fixed'>
                <TableHeader className='sticky top-0 z-20 bg-background shadow-[0_1px_0_var(--border)]'>
                    <TableRow className='hover:bg-transparent'>
                        {/* Corner cell: above both the sticky header and the sticky hour column */}
                        <TableHead className='sticky left-0 z-30 w-16 bg-background'>Saat</TableHead>
                        {days.map((day) => (
                            <TableHead
                                key={toDateParam(day)}
                                className={cn('text-center', toDateParam(day) === todayKey && 'bg-muted text-foreground')}
                            >
                                {day.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className='bg-muted/30 hover:bg-muted/30'>
                        <TableCell className='sticky left-0 z-10 bg-background align-top text-xs font-medium text-muted-foreground'>
                            Teslim
                        </TableCell>
                        {days.map((day) => (
                            <TableCell key={toDateParam(day)} className='align-top whitespace-normal'>
                                <div className='flex flex-col gap-1'>
                                    {getDuePostsOn(day).map((post) => (
                                        <Link
                                            key={post.id}
                                            href={`/app/customers/${post.customerId}/blogs/${post.id}`}
                                            className={cn(
                                                'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:underline',
                                                isPostOverdue(post) ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
                                            )}
                                            title={`${post.title} · ${post.customer?.fullName ?? ''}`}
                                        >
                                            <span className='truncate'>{post.title}</span>
                                            <PostPlatformBadges platforms={post.platforms} compact className='ml-auto shrink-0 [&_svg]:size-3' />
                                        </Link>
                                    ))}
                                </div>
                            </TableCell>
                        ))}
                    </TableRow>

                    {slots.map((slot) => (
                        <TableRow key={slot} className='hover:bg-transparent'>
                            <TableCell className='sticky left-0 z-10 bg-background align-top text-xs text-muted-foreground tabular-nums'>
                                {formatSlot(slot)}
                            </TableCell>
                            {days.map((day) => (
                                <TableCell
                                    key={toDateParam(day)}
                                    className={cn(
                                        'group/cell relative h-14 align-top whitespace-normal',
                                        toDateParam(day) === todayKey && 'bg-muted/40'
                                    )}
                                >
                                    <div className='flex flex-col gap-1 pr-5'>
                                        {getScheduledPostsIn(day, slot).map((post) => (
                                            <AgendaPostPopover key={post.id} post={post} />
                                        ))}
                                    </div>
                                    <Link
                                        href={`/app/blogs/add?scheduledAt=${toDateParam(day)}T${formatSlot(slot)}`}
                                        className='absolute top-1 right-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:opacity-0 lg:group-hover/cell:opacity-100 lg:focus-visible:opacity-100'
                                        aria-label={`${day.toLocaleDateString('tr-TR')} ${formatSlot(slot)} için yeni içerik`}
                                    >
                                        <IoAdd className='size-4' />
                                    </Link>
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )

    function getDuePostsOn(day: Date) {
        const key = toDateParam(day)
        return duePosts.filter(function (post) {
            return post.dueDate && toDateParam(new Date(post.dueDate)) === key
        })
    }

    function getScheduledPostsIn(day: Date, slot: number) {
        const key = toDateParam(day)
        return scheduledPosts.filter(function (post) {
            const scheduledAt = new Date(post.scheduledAt as Date)
            return toDateParam(scheduledAt) === key && scheduledAt.getHours() * 60 === slot
        })
    }
}
