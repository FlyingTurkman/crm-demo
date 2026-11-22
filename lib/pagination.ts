import { pageLimit } from '@/lib/src/constants'

// One page of a list (pageLimit records) plus the totals for ListPagination.
// The count and the page query run in parallel instead of one after the other;
// only a page past the end (e.g. after filtering) needs a second query for the last page.
export async function paginate<T>(
    page: number,
    count: () => Promise<number>,
    findPage: (skip: number) => Promise<T[]>
) {
    const [total, items] = await Promise.all([count(), findPage((page - 1) * pageLimit)])
    const pageCount = Math.max(1, Math.ceil(total / pageLimit))

    if (page <= pageCount) {
        return { items, total, page, pageCount }
    }
    return { items: await findPage((pageCount - 1) * pageLimit), total, page: pageCount, pageCount }
}
