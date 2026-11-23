import type { Metadata } from 'next'
import AddPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Yeni Not',
}

export default function Page() {
    return (
        <AddPageClient />
    )
}
