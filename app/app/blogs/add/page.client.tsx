'use client'

import PostForm from '@/components/app/posts/PostForm'
import type { PublicUserDto } from '@/dtos/userDTO'

// Post for any customer: the customer is picked in the form with a search bar
export default function AddPageClient({ users, initialScheduledAt }: { users: PublicUserDto[], initialScheduledAt?: string }) {
    return (
        <div className='p-4'>
            <PostForm users={users} initialScheduledAt={initialScheduledAt} />
        </div>
    )
}
