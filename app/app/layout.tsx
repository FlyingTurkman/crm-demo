import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import MainMenu from '@/components/app/layout/MainMenu'
import { getCurrentUser } from '@/lib/auth/session'

export default async function AppLayout({
    children
}: {
    children: ReactNode
}) {
    const user = await getCurrentUser()

    // proxy.ts already redirects guests, this is a second safety net
    if (!user) {
        redirect('/')
    }

    return (
        <div>
            <MainMenu />
            {children}
        </div>
    )
}
