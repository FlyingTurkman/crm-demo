import Link from 'next/link'
import type { IconType } from 'react-icons'
import PostDueBadge from '@/components/app/posts/PostDueBadge'
import PostPlatformBadges from '@/components/app/posts/PostPlatformBadges'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { postStatusLabels, postTypeLabels } from '@/lib/src/constants'
import type { Post } from '@/types'

// Posts by delivery day (overdue / due soon) with their customer, type, status and assignee
export default function DueList({
    title,
    description,
    icon: Icon,
    count,
    posts,
    allHref,
    emptyText
}: {
    title: string
    description: string
    icon: IconType
    count: number
    posts: Post[]
    allHref: string
    emptyText: string
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Icon className='text-muted-foreground' aria-hidden />
                    {title}
                    <Badge variant={count > 0 ? 'default' : 'secondary'}>{count}</Badge>
                </CardTitle>
                <CardDescription>{description}</CardDescription>
                {count > 0 && (
                    <CardAction>
                        <Link href={allHref} className='text-sm text-muted-foreground hover:text-foreground hover:underline'>
                            Tümünü gör
                        </Link>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent>
                {posts.length === 0 && (
                    <p className='py-4 text-center text-sm text-muted-foreground'>{emptyText}</p>
                )}
                <ul className='flex flex-col gap-1'>
                    {posts.map((post) => (
                        <li key={post.id}>
                            <Link
                                href={`/app/customers/${post.customerId}/blogs/${post.id}`}
                                className='flex flex-col gap-1 rounded-md px-2 py-1.5 hover:bg-muted sm:flex-row sm:items-center sm:gap-2'
                            >
                                <div className='grid min-w-0 flex-1 leading-tight'>
                                    <span className='truncate text-sm font-medium'>{post.title}</span>
                                    <span className='truncate text-xs text-muted-foreground'>
                                        {post.customer?.fullName} · {postTypeLabels[post.type]} · {postStatusLabels[post.status]} · {post.assignee?.fullName ?? 'Sorumlu yok'}
                                    </span>
                                </div>
                                <div className='flex items-center gap-2'>
                                    <PostPlatformBadges platforms={post.platforms} compact />
                                    <PostDueBadge dueDate={post.dueDate} status={post.status} />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
