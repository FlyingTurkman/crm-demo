import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCustomerCached, getCustomerPageTitle } from '@/lib/data'
import EditCustomerPageClient from './page.client'

type Params = Promise<{ customerId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { customerId } = await params
    return { title: await getCustomerPageTitle(customerId, 'Bilgileri Düzenle') }
}

export default async function Page({
    params
}: {
    params: Params
}) {
    const { customerId } = await params
    const result = await getCustomerCached(customerId)

    if (!result.customer) {
        notFound()
    }

    return (
        <EditCustomerPageClient customer={result.customer} />
    )
}
