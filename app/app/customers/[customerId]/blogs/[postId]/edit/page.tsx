import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostAssignees } from '@/actions/post'
import { getPostCached, getPostPageTitle } from '@/lib/data'
import EditBlogPageClient from './page.client'

type Params = Promise<{ customerId: string, postId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { postId } = await params
    return { title: await getPostPageTitle(postId, 'Düzenle') }
}

export default async function Page({
    params
}: {
    params: Params
}) {
    const { customerId, postId } = await params
    const [result, assignees] = await Promise.all([getPostCached(postId), getPostAssignees()])

    // A post of another customer must not open under this customer's URL
    if (!result.post || result.post.customerId !== customerId) {
        notFound()
    }

    return (
        <EditBlogPageClient post={result.post} users={assignees.users ?? []} />
    )
}
