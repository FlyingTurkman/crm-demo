import type { Metadata } from 'next'
import AddPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Yeni Blog',
}

export default function Page() {
    return (
        <AddPageClient />
    )
}
