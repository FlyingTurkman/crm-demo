'use client'

import { deletePost } from '@/actions/post'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import Link from 'next/link'
import { IoCalendar, IoPerson } from 'react-icons/io5'
import RichTextView from '@/components/app/editor/RichTextView'
import PostDueBadge from '@/components/app/posts/PostDueBadge'
import PostImageGallery from '@/components/app/posts/PostImageGallery'
import PostPlatformBadges from '@/components/app/posts/PostPlatformBadges'
import PostStatusSelect from '@/components/app/posts/PostStatusSelect'
import PostTypeBadge from '@/components/app/posts/PostTypeBadge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { toDateParam } from '@/lib/period'
import type { Post } from '@/types'

export default function BlogPageClient({ post }: { post: Post }) {
    const baseHref = `/app/customers/${post.customerId}/blogs`

    return (
        <div className='flex flex-col gap-4'>
            <Card>
                <CardHeader>
                    <CardTitle className='text-xl'>{post.title}</CardTitle>
                    <div className='flex flex-wrap items-center gap-2'>
                        <PostTypeBadge type={post.type} />
                        <PostPlatformBadges platforms={post.platforms} emptyText='Kanal seçilmedi' />
                        <PostDueBadge dueDate={post.dueDate} status={post.status} emptyText='Teslim tarihi yok' />
                        <span className='flex items-center gap-1 text-sm text-muted-foreground'>
                            <IoPerson aria-hidden /> {post.assignee?.fullName ?? 'Sorumlu atanmadı'}
                        </span>
                        {post.scheduledAt && (
                            <Link
                                href={`/app/agenda?date=${toDateParam(new Date(post.scheduledAt))}`}
                                className='flex items-center gap-1 text-sm text-muted-foreground hover:underline'
                                title='Ajandada göster'
                            >
                                <IoCalendar aria-hidden /> Yayın: {formatDateTime(post.scheduledAt)}
                            </Link>
                        )}
                    </div>
                    <CardDescription>
                        Oluşturulma: {formatDateTime(post.createdAt)} · Son güncelleme: {formatDateTime(post.updatedAt)}
                    </CardDescription>
                    <CardAction className='flex flex-col items-end gap-2 sm:flex-row'>
                        <PostStatusSelect postId={post.id} status={post.status} />
                        <EditDeleteMenu
                            size='sm'
                            editLabel='İçeriği Düzenle'
                            editHref={`${baseHref}/${post.id}/edit`}
                            deleteDescription={`"${post.title}" başlıklı içerik silinecek.`}
                            deletePermission='post:delete'
                            onDelete={handleDelete}
                        />
                    </CardAction>
                </CardHeader>
                <CardContent className='flex flex-col gap-6'>
                    <RichTextView html={post.rawContent} />
                    <PostImageGallery images={post.images} />
                </CardContent>
            </Card>
        </div>
    )

    function handleDelete() {
        return deletePost({ postId: post.id })
    }
}
