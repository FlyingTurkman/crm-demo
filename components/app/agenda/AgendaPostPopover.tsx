'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IoCreate, IoEye, IoPerson } from 'react-icons/io5'
import ResponsivePopover from '@/components/app/common/ResponsivePopover'
import PostDueBadge from '@/components/app/posts/PostDueBadge'
import PostPlatformBadges from '@/components/app/posts/PostPlatformBadges'
import PostStatusSelect from '@/components/app/posts/PostStatusSelect'
import PostTypeBadge from '@/components/app/posts/PostTypeBadge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatDateTime, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

// Left border color of an agenda card by status, from the theme tokens
const statusClassNames = {
    draft: 'border-l-muted-foreground/40',
    inReview: 'border-l-chart-3',
    published: 'border-l-primary',
}

// A scheduled post in an agenda cell; a click opens its details (bottom sheet on mobile)
export default function AgendaPostPopover({ post }: { post: Post }) {
    const [open, setOpen] = useState(false)
    const scheduledAt = new Date(post.scheduledAt as Date)
    const href = `/app/customers/${post.customerId}/blogs/${post.id}`

    return (
        <ResponsivePopover
            open={open}
            onOpenChange={setOpen}
            title={post.title}
            triggerLabel={`${post.title} içeriğinin ayrıntıları`}
            triggerClassName={cn(
                'flex w-full flex-col gap-0.5 rounded-md border border-l-4 bg-card px-2 py-1 text-left text-xs transition-colors hover:bg-muted',
                statusClassNames[post.status]
            )}
            trigger={
                <>
                    <span className='flex items-center justify-between gap-1'>
                        <span className='font-medium tabular-nums'>{formatTime(scheduledAt)}</span>
                        <PostPlatformBadges platforms={post.platforms} compact className='[&_svg]:size-3' />
                    </span>
                    <span className='line-clamp-2 font-medium'>{post.title}</span>
                    <span className='truncate text-muted-foreground'>{post.customer?.fullName}</span>
                </>
            }
            contentClassName='w-80'
        >
            <div className='flex flex-col gap-3'>
                <div className='flex flex-col gap-1'>
                    <p className='font-semibold'>{post.title}</p>
                    <Link href={`/app/customers/${post.customerId}`} className='text-sm text-muted-foreground hover:underline'>
                        {post.customer?.fullName}
                    </Link>
                </div>
                <div className='flex flex-wrap items-center gap-1'>
                    <PostTypeBadge type={post.type} />
                    <PostPlatformBadges platforms={post.platforms} />
                </div>
                <Separator />
                <dl className='grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm'>
                    <dt className='text-muted-foreground'>Yayın</dt>
                    <dd>{formatDateTime(scheduledAt)}</dd>
                    <dt className='text-muted-foreground'>Teslim</dt>
                    <dd><PostDueBadge dueDate={post.dueDate} status={post.status} emptyText='Yok' /></dd>
                    <dt className='text-muted-foreground'>Sorumlu</dt>
                    <dd className='flex items-center gap-1'>
                        <IoPerson aria-hidden /> {post.assignee?.fullName ?? 'Atanmadı'}
                    </dd>
                    <dt className='text-muted-foreground'>Durum</dt>
                    <dd><PostStatusSelect postId={post.id} status={post.status} /></dd>
                </dl>
                <Separator />
                <div className='flex gap-2'>
                    <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1')}>
                        <IoEye /> Görüntüle
                    </Link>
                    <Link href={`${href}/edit`} className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}>
                        <IoCreate /> Düzenle
                    </Link>
                </div>
            </div>
        </ResponsivePopover>
    )
}
