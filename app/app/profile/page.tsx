import type { Metadata } from 'next'
import ProfilePageClient from './page.client'

export const metadata: Metadata = {
    title: 'Profilim',
}

export default function Page() {
    return (
        <ProfilePageClient />
    )
}
