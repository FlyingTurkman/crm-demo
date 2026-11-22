import type { Metadata } from 'next'
import { getProfile } from '@/actions/profile'
import ProfilePageClient from './page.client'

export const metadata: Metadata = {
    title: 'Profilim',
}

export default async function Page() {
    const result = await getProfile()

    return (
        <ProfilePageClient
            profile={result.profile}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}
