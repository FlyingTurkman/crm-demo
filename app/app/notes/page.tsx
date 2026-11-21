import { getAllNotes } from '@/actions/note'
import { noteSorts } from '@/lib/src/constants'
import NotesPageClient from './page.client'

type NoteSort = (typeof noteSorts)[number]

export default async function Page({
    searchParams
}: {
    searchParams: Promise<{ q?: string, sort?: string, page?: string }>
}) {
    const params = await searchParams
    // Unknown values in the URL are ignored instead of failing validation
    const query = params.q?.trim() || undefined
    const sort = noteSorts.find(function (item) {
        return item === params.sort
    }) as NoteSort | undefined
    const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

    const result = await getAllNotes({ query, sort, page })

    return (
        <NotesPageClient
            notes={result.notes ?? []}
            total={result.total ?? 0}
            page={result.page ?? 1}
            pageCount={result.pageCount ?? 1}
            filters={{ query: query ?? '', sort: sort ?? 'updated' }}
            errorMessage={result.status ? undefined : result.message}
        />
    )
}
