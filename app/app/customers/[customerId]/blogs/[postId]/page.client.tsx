'use client'

import { deletePost } from '@/actions/post'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import RichTextView from '@/components/app/editor/RichTextView'
import PostStatusSelect from '@/components/app/posts/PostStatusSelect'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import type { Post } from '@/types'

export default function BlogPageClient({ post }: { post: Post }) {
    const baseHref = `/app/customers/${post.customerId}/blogs`

    return (
        <div className='flex flex-col gap-4'>
            <Card>
                <CardHeader>
                    <CardTitle className='text-xl'>{post.title}</CardTitle>
                    <CardDescription>
                        Oluşturulma: {formatDateTime(post.createdAt)} · Son güncelleme: {formatDateTime(post.updatedAt)}
                    </CardDescription>
                    <CardAction className='flex flex-row gap-2'>
                        <PostStatusSelect postId={post.id} status={post.status} />
                        <EditDeleteMenu
                            size='sm'
                            editLabel='Blogu Düzenle'
                            editHref={`${baseHref}/${post.id}/edit`}
                            deleteDescription={`"${post.title}" başlıklı blog silinecek.`}
                            deletePermission='post:delete'
                            onDelete={handleDelete}
                        />
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <RichTextView html={post.rawContent} />
                </CardContent>
            </Card>
        </div>
    )

    function handleDelete() {
        return deletePost({ postId: post.id })
    }
}
