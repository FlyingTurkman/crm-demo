'use client'

import PostForm from '@/components/app/posts/PostForm'
import type { PublicUserDto } from '@/dtos/userDTO'
import type { Post } from '@/types'

export default function EditBlogPageClient({ post, users }: { post: Post, users: PublicUserDto[] }) {
    return (
        <PostForm customerId={post.customerId} post={post} users={users} />
    )
}
