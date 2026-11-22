import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUserCached, getUserPageTitle } from '@/lib/data'
import EditUserPageClient from './page.client'

type Params = Promise<{ userId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { userId } = await params
    return { title: await getUserPageTitle(userId, 'Düzenle') }
}

export default async function Page({
    params
}: {
    params: Params
}) {
    const { userId } = await params
    const result = await getUserCached(userId)

    if (!result.user) {
        notFound()
    }

    return (
        <EditUserPageClient user={result.user} />
    )
}
