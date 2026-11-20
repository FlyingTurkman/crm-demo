import { notFound } from 'next/navigation'
import { getCustomer } from '@/actions/customer'
import CustomerPageClient from './page.client'

export default async function Page({
    params
}: {
    params: Promise<{ customerId: string }>
}) {
    const { customerId } = await params
    const result = await getCustomer({ customerId })

    if (!result.customer || !result.postStatusCounts) {
        notFound()
    }

    return (
        <CustomerPageClient customer={result.customer} postStatusCounts={result.postStatusCounts} />
    )
}
