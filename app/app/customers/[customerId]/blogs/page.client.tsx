'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { PostStatus } from '@prisma/client'
import { IoAdd } from 'react-icons/io5'
import { deletePost } from '@/actions/post'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import PostStatusSelect from '@/components/app/posts/PostStatusSelect'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/format'
import { createdPeriodLabels, pageLimit, postSortLabels, postSorts, postStatusLabels } from '@/lib/src/constants'
import type { CreatedPeriod } from '@/lib/period'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

type CustomerBlogListFilters = {
    query: string
    period?: CreatedPeriod
    status?: PostStatus
    sort: (typeof postSorts)[number]
}

const statusFilterLabels: Record<string, string> = {
    all: 'Tüm durumlar',
    ...postStatusLabels,
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
    const hasFilters = Boolean(filters.query || filters.status || filters.period)
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <p className='text-sm text-muted-foreground'>
                    {total === 0 ? 'Gösterilecek blog yok' : `${total} blogdan ${firstIndex}-${lastIndex} arası gösteriliyor`}
                </p>
                <Link href={`${baseHref}/add`} className={buttonVariants()}>
                    <IoAdd /> Yeni Blog Ekle
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
                    {hasFilters ? 'Filtrelere uyan blog bulunamadı' : 'Bu müşterinin henüz blogu yok'}
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
                        <CardDescription>Son güncelleme: {formatDate(post.updatedAt)}</CardDescription>
                        <CardAction className='flex flex-row gap-2'>
                            <PostStatusSelect postId={post.id} status={post.status} />
                            <EditDeleteMenu
                                size='sm'
                                editLabel='Blogu Düzenle'
                                editHref={`${baseHref}/${post.id}/edit`}
                                deleteDescription={`"${post.title}" başlıklı blog silinecek.`}
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
