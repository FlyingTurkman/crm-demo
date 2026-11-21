'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { PostStatus } from '@prisma/client'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import PostStatusSelect from '@/components/app/posts/PostStatusSelect'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { pageLimit, postSortLabels, postSorts, postStatusLabels } from '@/lib/src/constants'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

type BlogListFilters = {
    query: string
    status?: PostStatus
    sort: (typeof postSorts)[number]
}

const statusFilterLabels: Record<string, string> = {
    all: 'Tüm durumlar',
    ...postStatusLabels,
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
    const hasFilters = Boolean(filters.query || filters.status)
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div>
                <h1 className='text-2xl font-semibold'>Bloglar</h1>
                <p className='text-sm text-muted-foreground'>
                    {total === 0 ? 'Gösterilecek blog yok' : `${total} blogdan ${firstIndex}-${lastIndex} arası gösteriliyor`}
                </p>
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
                            <TableHead>Durum</TableHead>
                            <TableHead className='hidden md:table-cell'>Son Güncelleme</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                                    {hasFilters ? 'Filtrelere uyan blog bulunamadı' : 'Henüz blog yok'}
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
                                <TableCell>
                                    <PostStatusSelect postId={post.id} status={post.status} />
                                </TableCell>
                                <TableCell className='hidden text-muted-foreground md:table-cell'>{formatDate(post.updatedAt)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ListPagination page={page} pageCount={pageCount} startTransition={startTransition} />
        </div>
    )
}
