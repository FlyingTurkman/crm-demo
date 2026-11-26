'use client'

import PostForm from '@/components/app/posts/PostForm'
import type { PublicUserDto } from '@/dtos/userDTO'

export default function NewBlogPageClient({
    customerId,
    users,
    initialScheduledAt
}: {
    customerId: string
    users: PublicUserDto[]
    initialScheduledAt?: string
}) {
    return (
        <PostForm customerId={customerId} users={users} initialScheduledAt={initialScheduledAt} />
    )
}
