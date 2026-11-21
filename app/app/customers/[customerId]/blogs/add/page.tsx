import NewBlogPageClient from './page.client'

export default async function Page({
    params
}: {
    params: Promise<{ customerId: string }>
}) {
    const { customerId } = await params

    return (
        <NewBlogPageClient customerId={customerId} />
    )
}
