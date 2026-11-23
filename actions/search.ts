'use server'

import { z } from 'zod'
import { searchCustomers } from '@/actions/customer'
import { searchNotes } from '@/actions/note'
import { searchPosts } from '@/actions/post'
import { authorize } from '@/lib/auth/authorize'
import { globalSearchCategoryLimit, maxSearchLength } from '@/lib/src/constants'
import type { Customer, Note, Post, Response } from '@/types'

// The menu's search reads every model, so it lives in its own file instead of a model's
// (like actions/dashboard.ts). It reuses each model's search action: their zod validation,
// permission checks and Turkish-insensitive searchText matching stay in one place.

const searchAllSchema = z.object({
    query: z
        .string()
        .trim()
        .min(1, 'Arama metni boş olamaz')
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`),
})

type SearchAllResponse = Response & {
    customers?: Customer[]
    posts?: Post[]
    notes?: Note[]
}

export async function searchAll(input: z.input<typeof searchAllSchema>): Promise<SearchAllResponse> {
    const auth = await authorize('customer:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = searchAllSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }
    const searchInput = { query: parsed.data.query }

    // One round trip from the browser: Next.js runs a client's Server Action calls one after
    // the other, so the three searches are started together here on the server instead
    const [customerResult, postResult, noteResult] = await Promise.all([
        searchCustomers(searchInput),
        searchPosts(searchInput),
        searchNotes(searchInput),
    ])

    return {
        status: true,
        customers: (customerResult.customers ?? []).slice(0, globalSearchCategoryLimit),
        posts: (postResult.posts ?? []).slice(0, globalSearchCategoryLimit),
        notes: (noteResult.notes ?? []).slice(0, globalSearchCategoryLimit),
    }
}
