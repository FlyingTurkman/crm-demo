import NewNotePageClient from './page.client'

export default async function Page({
    params
}: {
    params: Promise<{ customerId: string }>
}) {
    const { customerId } = await params

    return (
        <NewNotePageClient customerId={customerId} />
    )
}
