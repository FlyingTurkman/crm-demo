'use client'

import PostForm from '@/components/app/posts/PostForm'
import type { Post } from '@/types'

export default function EditBlogPageClient({ post }: { post: Post }) {
    return (
        <PostForm customerId={post.customerId} post={post} />
    )
}
