import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostCached, getPostPageTitle } from '@/lib/data'
import BlogPageClient from './page.client'

type Params = Promise<{ customerId: string, postId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { postId } = await params
    return { title: await getPostPageTitle(postId) }
}

export default async function Page({
    params
}: {
    params: Params
}) {
    const { customerId, postId } = await params
    const result = await getPostCached(postId)

    // A post of another customer must not open under this customer's URL
    if (!result.post || result.post.customerId !== customerId) {
        notFound()
    }

    return (
        <BlogPageClient post={result.post} />
    )
}
