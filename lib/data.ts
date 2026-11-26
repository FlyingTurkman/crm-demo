import { cache } from 'react'
import { getCustomer } from '@/actions/customer'
import { getNote } from '@/actions/note'
import { getPost } from '@/actions/post'
import { getUser } from '@/actions/user'

// Request-scoped memoized reads for server components.
// A layout, its page and generateMetadata often need the same record:
// with these the database is queried once per request instead of three times.
// (Arguments are plain strings because cache() compares them by identity.)

export const getCustomerCached = cache(async function (customerId: string) {
    return getCustomer({ customerId })
})

export const getPostCached = cache(async function (postId: string) {
    return getPost({ postId })
})

export const getNoteCached = cache(async function (noteId: string) {
    return getNote({ noteId })
})

export const getUserCached = cache(async function (userId: string) {
    return getUser({ userId })
})

// Page titles for generateMetadata, e.g. 'Ahmet Yılmaz - İçerikler'
export async function getCustomerPageTitle(customerId: string, section?: string) {
    const result = await getCustomerCached(customerId)
    if (!result.customer) {
        return 'Müşteri bulunamadı'
    }
    return section ? `${result.customer.fullName} - ${section}` : result.customer.fullName
}

export async function getUserPageTitle(userId: string, section?: string) {
    const result = await getUserCached(userId)
    if (!result.user) {
        return 'Kullanıcı bulunamadı'
    }
    return section ? `${result.user.fullName} - ${section}` : result.user.fullName
}

export async function getPostPageTitle(postId: string, section?: string) {
    const result = await getPostCached(postId)
    if (!result.post) {
        return 'İçerik bulunamadı'
    }
    return section ? `${result.post.title} - ${section}` : result.post.title
}
