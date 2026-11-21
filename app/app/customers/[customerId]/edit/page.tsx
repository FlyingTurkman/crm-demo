import { notFound } from 'next/navigation'
import { getCustomer } from '@/actions/customer'
import EditCustomerPageClient from './page.client'

export default async function Page({
    params
}: {
    params: Promise<{ customerId: string }>
}) {
    const { customerId } = await params
    const result = await getCustomer({ customerId })

    if (!result.customer) {
        notFound()
    }

    return (
        <EditCustomerPageClient customer={result.customer} />
    )
}
