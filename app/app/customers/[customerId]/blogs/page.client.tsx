'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { PostPlatform, PostStatus, PostType } from '@prisma/client'
import { IoAdd, IoPerson } from 'react-icons/io5'
import { deletePost } from '@/actions/post'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import PostDueBadge from '@/components/app/posts/PostDueBadge'
import PostStatusSelect from '@/components/app/posts/PostStatusSelect'
import PostTypeBadge from '@/components/app/posts/PostTypeBadge'
import PostPlatformBadges from '@/components/app/posts/PostPlatformBadges'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/format'
import {
    createdPeriodLabels,
    pageLimit,
    postAssigneeFilterLabels,
    postAssigneeFilters,
    postDueFilterLabels,
    postPlatformLabels,
    postSortLabels,
    postSorts,
    postStatusLabels,
    postTypeLabels,
} from '@/lib/src/constants'
import type { CreatedPeriod, PostDueFilter } from '@/lib/period'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

type CustomerBlogListFilters = {
    query: string
    period?: CreatedPeriod
    status?: PostStatus
    type?: PostType
    platform?: PostPlatform
    due?: PostDueFilter
    assignee?: (typeof postAssigneeFilters)[number]
    sort: (typeof postSorts)[number]
}

const statusFilterLabels: Record<string, string> = {
    all: 'Tüm durumlar',
    ...postStatusLabels,
}

const typeFilterLabels: Record<string, string> = {
    all: 'Tüm türler',
    ...postTypeLabels,
}

const platformFilterLabels: Record<string, string> = {
    all: 'Tüm kanallar',
    ...postPlatformLabels,
}

export default function CustomerBlogsPageClient({
    customerId,
    posts,
    total,
    page,
    pageCount,
    filters
}: {
    customerId: string
    posts: Post[]
    total: number
    page: number
    pageCount: number
    filters: CustomerBlogListFilters
}) {
    // Shared by filters and pagination: dims the list while the next page loads
    const [isPending, startTransition] = useTransition()
    const baseHref = `/app/customers/${customerId}/blogs`
    const hasFilters = Boolean(filters.query || filters.status || filters.type || filters.platform || filters.due || filters.assignee || filters.period)
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <p className='text-sm text-muted-foreground'>
                    {total === 0 ? 'Gösterilecek içerik yok' : `${total} içerikten ${firstIndex}-${lastIndex} arası gösteriliyor`}
                </p>
                <Link href={`${baseHref}/add`} className={buttonVariants()}>
                    <IoAdd /> Yeni İçerik Ekle
                </Link>
            </div>

            <ListFilters
                query={filters.query}
                placeholder='Başlık veya içerik...'
                selects={[
                    {
                        param: 'status',
                        value: filters.status ?? 'all',
                        defaultValue: 'all',
                        items: statusFilterLabels,
                        label: 'Duruma göre filtrele',
                        className: 'lg:w-44',
                    },
                    {
                        param: 'type',
                        value: filters.type ?? 'all',
                        defaultValue: 'all',
                        items: typeFilterLabels,
                        label: 'Türe göre filtrele',
                        className: 'lg:w-44',
                    },
                    {
                        param: 'platform',
                        value: filters.platform ?? 'all',
                        defaultValue: 'all',
                        items: platformFilterLabels,
                        label: 'Kanala göre filtrele',
                        className: 'lg:w-44',
                    },
                    {
                        param: 'due',
                        value: filters.due ?? 'all',
                        defaultValue: 'all',
                        items: postDueFilterLabels,
                        label: 'Teslim tarihine göre filtrele',
                        className: 'lg:w-52',
                    },
                    {
                        param: 'assignee',
                        value: filters.assignee ?? 'all',
                        defaultValue: 'all',
                        items: postAssigneeFilterLabels,
                        label: 'Sorumluya göre filtrele',
                        className: 'lg:w-48',
                    },
                    {
                        param: 'period',
                        value: filters.period ?? 'all',
                        defaultValue: 'all',
                        items: createdPeriodLabels,
                        label: 'Eklenme zamanı',
                        className: 'lg:w-44',
                    },
                    {
                        param: 'sort',
                        value: filters.sort,
                        defaultValue: 'updated',
                        items: postSortLabels,
                        label: 'Sıralama',
                        className: 'lg:w-48',
                    },
                ]}
                isPending={isPending}
                startTransition={startTransition}
            />

            {posts.length === 0 && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                    {hasFilters ? 'Filtrelere uyan içerik bulunamadı' : 'Bu müşterinin henüz içeriği yok'}
                </p>
            )}

            {posts.map((post) => (
                <Card key={post.id} className={cn('transition-opacity', isPending && 'opacity-60')}>
                    <CardHeader>
                        <CardTitle>
                            <Link href={`${baseHref}/${post.id}`} className='hover:underline'>
                                {post.title}
                            </Link>
                        </CardTitle>
                        <CardDescription className='flex flex-wrap items-center gap-2'>
                            <PostTypeBadge type={post.type} />
                            <PostPlatformBadges platforms={post.platforms} compact />
                            <PostDueBadge dueDate={post.dueDate} status={post.status} />
                            <span className='flex items-center gap-1'>
                                <IoPerson aria-hidden /> {post.assignee?.fullName ?? 'Atanmadı'}
                            </span>
                            <span>· Son güncelleme: {formatDate(post.updatedAt)}</span>
                        </CardDescription>
                        <CardAction className='flex flex-col items-end gap-2 sm:flex-row'>
                            <PostStatusSelect postId={post.id} status={post.status} />
                            <EditDeleteMenu
                                size='sm'
                                editLabel='İçeriği Düzenle'
                                editHref={`${baseHref}/${post.id}/edit`}
                                deleteDescription={`"${post.title}" başlıklı içerik silinecek.`}
                                deletePermission='post:delete'
                                onDelete={function () {
                                    return deletePost({ postId: post.id })
                                }}
                            />
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <p className='line-clamp-2 text-sm text-muted-foreground'>{post.content}</p>
                    </CardContent>
                </Card>
            ))}

            <ListPagination page={page} pageCount={pageCount} startTransition={startTransition} />
        </div>
    )
}
