import type { Metadata } from 'next'
import { getCustomerPageTitle } from '@/lib/data'
import NewBlogPageClient from './page.client'

export async function generateMetadata({ params }: { params: Promise<{ customerId: string }> }): Promise<Metadata> {
    const { customerId } = await params
    return { title: await getCustomerPageTitle(customerId, 'Yeni Blog') }
}

export default async function Page({
    params
}: {
    params: Promise<{ customerId: string }>
}) {
    const { customerId } = await params

    return (
        <NewBlogPageClient customerId={customerId} />
    )
}
