import type { Metadata } from 'next'
import NewCustomerPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Yeni Müşteri',
}

export default function Page() {
    return (
        <NewCustomerPageClient />
    )
}
