import { notFound } from 'next/navigation'
import { getPost } from '@/actions/post'
import EditBlogPageClient from './page.client'

export default async function Page({
    params
}: {
    params: Promise<{ customerId: string, postId: string }>
}) {
    const { customerId, postId } = await params
    const result = await getPost({ postId })

    // A post of another customer must not open under this customer's URL
    if (!result.post || result.post.customerId !== customerId) {
        notFound()
    }

    return (
        <EditBlogPageClient post={result.post} />
    )
}
