import type { PostStatus } from '@prisma/client'
import { IoAlarm, IoCalendarClear } from 'react-icons/io5'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { isPostOverdue } from '@/lib/period'

// Delivery day of a post, red when it passed and the post still isn't published
export default function PostDueBadge({
    dueDate,
    status,
    emptyText
}: {
    dueDate: Date | string | null
    status: PostStatus
    // Shown when there is no delivery day (nothing by default)
    emptyText?: string
}) {
    if (!dueDate) {
        return emptyText ? <span className='text-sm text-muted-foreground'>{emptyText}</span> : null
    }

    if (isPostOverdue({ dueDate, status })) {
        return (
            <Badge variant='destructive' title='Teslim tarihi geçti, içerik henüz yayında değil'>
                <IoAlarm aria-hidden /> Gecikti · {formatDate(dueDate)}
            </Badge>
        )
    }

    return (
        <Badge variant='secondary' title='Teslim tarihi'>
            <IoCalendarClear aria-hidden /> {formatDate(dueDate)}
        </Badge>
    )
}
