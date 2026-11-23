'use client'

import PostForm from '@/components/app/posts/PostForm'

// Blog for any customer: the customer is picked in the form with a search bar
export default function AddPageClient() {
    return (
        <div className='p-4'>
            <PostForm />
        </div>
    )
}
