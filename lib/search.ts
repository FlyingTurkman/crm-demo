import { normalizeSearchText } from '@/lib/src/searchText'

// Prisma sends `contains` to MongoDB as a regex without escaping it:
// '(' would crash the query and '.' would match everything
export function escapeRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Where clause of a text search, for every searchable model (customer, post, note, user).
// The query is normalized like the stored searchText (lib/src/searchText.ts), so Turkish
// casing ('ŞAHİN', 'IŞIK') and text typed without Turkish characters ('gunes') both match.
export function getSearchWhere(query: string | undefined) {
    const search = query ? normalizeSearchText(query) : ''
    return search ? { searchText: { contains: escapeRegex(search) } } : {}
}
