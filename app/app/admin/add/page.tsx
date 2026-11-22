import type { Metadata } from 'next'
import NewUserPageClient from './page.client'

export const metadata: Metadata = {
    title: 'Yeni Kullanıcı',
}

export default function Page() {
    return (
        <NewUserPageClient />
    )
}
