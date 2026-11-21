'use client'

import PostForm from '@/components/app/posts/PostForm'

export default function NewBlogPageClient({ customerId }: { customerId: string }) {
    return (
        <PostForm customerId={customerId} />
    )
}
