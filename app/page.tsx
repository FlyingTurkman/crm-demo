import type { Metadata } from 'next'
import LoginPageClient from './page.client'

export const metadata: Metadata = {
    // The root layout's title template doesn't apply to its own segment's page
    title: { absolute: 'Giriş Yap | CRM' },
}

export default function Page() {
    return (
        <LoginPageClient />
    )
}
