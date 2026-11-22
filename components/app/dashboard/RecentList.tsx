import Link from 'next/link'
import type { IconType } from 'react-icons'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, formatTime } from '@/lib/format'

export type RecentListItem = {
    id: string
    title: string
    subtitle?: string
    href: string
    createdAt: Date
}

// Records created in the selected range; "Tümünü gör" opens the list filtered with the same ?period=
export default function RecentList({
    title,
    icon: Icon,
    count,
    items,
    allHref,
    emptyText,
    showDate
}: {
    title: string
    icon: IconType
    count: number
    items: RecentListItem[]
    // Left out when no list filter matches the shown range
    allHref?: string
    emptyText: string
    // Longer ranges show the day too, not only the time
    showDate: boolean
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Icon className='text-muted-foreground' aria-hidden />
                    {title}
                    <Badge variant='secondary'>{count}</Badge>
                </CardTitle>
                {count > 0 && allHref && (
                    <CardAction>
                        <Link href={allHref} className='text-sm text-muted-foreground hover:text-foreground hover:underline'>
                            Tümünü gör
                        </Link>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent>
                {items.length === 0 && (
                    <p className='py-4 text-center text-sm text-muted-foreground'>{emptyText}</p>
                )}
                <ul className='flex flex-col gap-1'>
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link href={item.href} className='flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted'>
                                <div className='grid flex-1 leading-tight'>
                                    <span className='truncate text-sm font-medium'>{item.title}</span>
                                    {item.subtitle && (
                                        <span className='truncate text-xs text-muted-foreground'>{item.subtitle}</span>
                                    )}
                                </div>
                                <span className='text-xs text-muted-foreground tabular-nums'>{showDate ? formatDateTime(item.createdAt) : formatTime(item.createdAt)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
