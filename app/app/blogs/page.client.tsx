'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { PostPlatform, PostStatus, PostType } from '@prisma/client'
import { IoAdd } from 'react-icons/io5'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import PostDueBadge from '@/components/app/posts/PostDueBadge'
import PostPlatformBadges from '@/components/app/posts/PostPlatformBadges'
import PostStatusSelect from '@/components/app/posts/PostStatusSelect'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

type BlogListFilters = {
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

export default function BlogsPageClient({
    posts,
    total,
    page,
    pageCount,
    filters,
    errorMessage
}: {
    posts: Post[]
    total: number
    page: number
    pageCount: number
    filters: BlogListFilters
    errorMessage?: string
}) {
    // Shared by filters and pagination: dims the table while the next page loads
    const [isPending, startTransition] = useTransition()
    const hasFilters = Boolean(filters.query || filters.status || filters.type || filters.platform || filters.due || filters.assignee || filters.period)
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <div className='min-w-0'>
                    <h1 className='text-2xl font-semibold'>İçerikler</h1>
                    <p className='text-sm text-muted-foreground'>
                        {total === 0 ? 'Gösterilecek içerik yok' : `${total} içerikten ${firstIndex}-${lastIndex} arası gösteriliyor`}
                    </p>
                </div>
                <Link href='/app/blogs/add' className={cn(buttonVariants(), 'shrink-0')}>
                    <IoAdd /> Yeni İçerik
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

            {errorMessage && (
                <p className='text-sm text-destructive'>{errorMessage}</p>
            )}

            <div className={cn('rounded-lg border transition-opacity', isPending && 'opacity-60')}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Başlık</TableHead>
                            <TableHead>Müşteri</TableHead>
                            <TableHead className='hidden sm:table-cell'>Tür / Kanal</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className='hidden lg:table-cell'>Sorumlu</TableHead>
                            <TableHead className='hidden md:table-cell'>Teslim</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                                    {hasFilters ? 'Filtrelere uyan içerik bulunamadı' : 'Henüz içerik yok'}
                                </TableCell>
                            </TableRow>
                        )}
                        {posts.map((post) => (
                            <TableRow key={post.id}>
                                <TableCell className='max-w-80'>
                                    <Link
                                        href={`/app/customers/${post.customerId}/blogs/${post.id}`}
                                        className='block truncate font-medium hover:underline'
                                    >
                                        {post.title}
                                    </Link>
                                    <p className='truncate text-xs text-muted-foreground'>{post.content}</p>
                                </TableCell>
                                <TableCell>
                                    <Link href={`/app/customers/${post.customerId}`} className='text-muted-foreground hover:underline'>
                                        {post.customer?.fullName}
                                    </Link>
                                </TableCell>
                                <TableCell className='hidden text-muted-foreground sm:table-cell'>
                                    <div className='flex flex-col gap-1'>
                                        <span>{postTypeLabels[post.type]}</span>
                                        <PostPlatformBadges platforms={post.platforms} compact />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <PostStatusSelect postId={post.id} status={post.status} />
                                </TableCell>
                                <TableCell className='hidden text-muted-foreground lg:table-cell'>{post.assignee?.fullName ?? '—'}</TableCell>
                                <TableCell className='hidden md:table-cell'>
                                    <PostDueBadge dueDate={post.dueDate} status={post.status} emptyText='—' />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ListPagination page={page} pageCount={pageCount} startTransition={startTransition} />
        </div>
    )
}
