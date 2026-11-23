'use server'

import { revalidatePath } from 'next/cache'
import { PostStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { paginate } from '@/lib/pagination'
import { authorize } from '@/lib/auth/authorize'
import { sanitizeRichTextHtml } from '@/lib/richText'
import { getPeriodWhere, type CreatedPeriod } from '@/lib/period'
import { getSearchWhere } from '@/lib/search'
import {
    createdPeriods,
    maxPostContentLength,
    maxPostTitleLength,
    maxRawContentLength,
    maxSearchLength,
    objectIdPattern,
    pageLimit,
    postSorts,
    searchResultLimit,
    sidebarPostLimit,
} from '@/lib/src/constants'
import type { Post, Response } from '@/types'

const customerIdField = z.string().regex(objectIdPattern, 'Geçersiz müşteri')
const postIdField = z.string().regex(objectIdPattern, 'Geçersiz blog')
const statusField = z.enum(PostStatus, 'Geçersiz durum')

const postFields = {
    title: z
        .string()
        .trim()
        .min(1, 'Başlık zorunludur')
        .max(maxPostTitleLength, `Başlık en fazla ${maxPostTitleLength} karakter olabilir`),
    status: statusField,
    // Plain text output of the editor (serializeToPlainText)
    content: z
        .string()
        .refine(function (value) {
            return value.trim().length > 0
        }, 'İçerik zorunludur')
        .refine(function (value) {
            return value.length <= maxPostContentLength
        }, `İçerik en fazla ${maxPostContentLength} karakter olabilir`),
    // HTML output of the editor (serializeToHtml), sanitized before saving
    rawContent: z
        .string()
        .max(maxRawContentLength, 'İçerik çok büyük'),
}

// Search, filter, sort and page of blog lists
const postListFields = {
    query: z
        .string()
        .trim()
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`)
        .optional(),
    status: statusField.optional(),
    period: z.enum(createdPeriods, 'Geçersiz tarih aralığı').optional(),
    sort: z.enum(postSorts, 'Geçersiz sıralama').default('updated'),
    page: z.coerce.number().int().min(1, 'Geçersiz sayfa').default(1),
}

const getPostsSchema = z.object({
    customerId: customerIdField,
    ...postListFields,
})

const getAllPostsSchema = z.object(postListFields)

const postOrderBy: Record<PostSort, Prisma.PostOrderByWithRelationInput> = {
    updated: { updatedAt: 'desc' },
    created: { createdAt: 'desc' },
    title: { title: 'asc' },
}

function getPostListWhere(
    query: string | undefined,
    status: PostStatus | undefined,
    period?: CreatedPeriod
): Prisma.PostWhereInput {
    return {
        isDeleted: false,
        customer: { isDeleted: false },
        ...(status ? { status } : {}),
        ...getPeriodWhere(period),
        // Title and plain text content (Turkish-insensitive, see lib/src/searchText.ts)
        ...getSearchWhere(query),
    }
}

const searchPostsSchema = z.object({
    query: z
        .string()
        .trim()
        .min(1, 'Arama metni boş olamaz')
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`),
})

const getPostSchema = z.object({
    postId: postIdField,
})

const createPostSchema = z.object({
    customerId: customerIdField,
    ...postFields,
})

const updatePostSchema = z.object({
    postId: postIdField,
    ...postFields,
})

const updatePostStatusSchema = z.object({
    postId: postIdField,
    status: statusField,
})

type GetPostsResponse = Response & {
    posts?: Post[]
    total?: number
    page?: number
    pageCount?: number
}

type GetAllPostsResponse = Response & {
    posts?: Post[]
    total?: number
    page?: number
    pageCount?: number
}

type GetRecentPostsResponse = Response & {
    posts?: Post[]
}

type SearchPostsResponse = Response & {
    posts?: Post[]
}

type PostSort = (typeof postSorts)[number]

type GetPostResponse = Response & {
    post?: Post
}

type CreatePostResponse = Response & {
    post?: Post
    href?: string
}

type UpdatePostResponse = Response & {
    post?: Post
    href?: string
}

type UpdatePostStatusResponse = Response & {
    post?: Post
}

type DeletePostResponse = Response & {
    href?: string
}

export async function getPosts(input: z.input<typeof getPostsSchema>): Promise<GetPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getPostsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId, query, status, period, sort, page } = parsed.data
    const where: Prisma.PostWhereInput = {
        ...getPostListWhere(query, status, period),
        customerId,
    }

    const result = await paginate(page, function () {
        return prisma.post.count({ where })
    }, function (skip) {
        return prisma.post.findMany({
            where,
            orderBy: postOrderBy[sort],
            skip,
            take: pageLimit,
        })
    })
    const posts = result.items
    return { status: true, posts, total: result.total, page: result.page, pageCount: result.pageCount }
}

// Blogs of all customers, for /app/blogs
export async function getAllPosts(input: z.input<typeof getAllPostsSchema>): Promise<GetAllPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getAllPostsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { query, status, period, sort, page } = parsed.data
    const where = getPostListWhere(query, status, period)

    const result = await paginate(page, function () {
        return prisma.post.count({ where })
    }, function (skip) {
        return prisma.post.findMany({
            where,
            orderBy: postOrderBy[sort],
            skip,
            take: pageLimit,
            include: { customer: true },
        })
    })
    const posts = result.items
    return { status: true, posts, total: result.total, page: result.page, pageCount: result.pageCount }
}

export async function getRecentPosts(): Promise<GetRecentPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const posts = await prisma.post.findMany({
        where: { isDeleted: false, customer: { isDeleted: false } },
        orderBy: { updatedAt: 'desc' },
        take: sidebarPostLimit,
        include: { customer: true },
    })
    return { status: true, posts }
}

export async function searchPosts(input: z.input<typeof searchPostsSchema>): Promise<SearchPostsResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = searchPostsSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const posts = await prisma.post.findMany({
        where: {
            isDeleted: false,
            customer: { isDeleted: false },
            ...getSearchWhere(parsed.data.query),
        },
        orderBy: { updatedAt: 'desc' },
        take: searchResultLimit,
        include: { customer: true },
    })
    return { status: true, posts }
}

export async function getPost(input: z.input<typeof getPostSchema>): Promise<GetPostResponse> {
    const auth = await authorize('post:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getPostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const post = await prisma.post.findFirst({
        where: { id: parsed.data.postId, isDeleted: false, customer: { isDeleted: false } },
    })
    if (!post) {
        return { status: false, message: 'Blog bulunamadı' }
    }
    return { status: true, post }
}

export async function createPost(input: z.input<typeof createPostSchema>): Promise<CreatePostResponse> {
    const auth = await authorize('post:create')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = createPostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId, title, status, content, rawContent } = parsed.data

    const customer = await prisma.customer.findFirst({
        where: { id: customerId, isDeleted: false },
        select: { id: true },
    })
    if (!customer) {
        return { status: false, message: 'Müşteri bulunamadı' }
    }

    const post = await prisma.post.create({
        data: {
            customerId,
            title,
            status,
            content,
            rawContent: sanitizeRichTextHtml(rawContent),
        },
    })

    // 'layout' also refreshes the blog counts in the customer header and sidebar
    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    return { status: true, message: 'Blog oluşturuldu', post, href: `/app/customers/${customerId}/blogs/${post.id}` }
}

export async function updatePost(input: z.input<typeof updatePostSchema>): Promise<UpdatePostResponse> {
    const auth = await authorize('post:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updatePostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { postId, title, status, content, rawContent } = parsed.data

    const existing = await prisma.post.findFirst({
        where: { id: postId, isDeleted: false, customer: { isDeleted: false } },
        select: { id: true },
    })
    if (!existing) {
        return { status: false, message: 'Blog bulunamadı' }
    }

    const post = await prisma.post.update({
        where: { id: postId },
        data: {
            title,
            status,
            content,
            rawContent: sanitizeRichTextHtml(rawContent),
        },
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    return { status: true, message: 'Blog güncellendi', post, href: `/app/customers/${post.customerId}/blogs/${post.id}` }
}

export async function updatePostStatus(input: z.input<typeof updatePostStatusSchema>): Promise<UpdatePostStatusResponse> {
    const auth = await authorize('post:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updatePostStatusSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { postId, status } = parsed.data

    const existing = await prisma.post.findFirst({
        where: { id: postId, isDeleted: false, customer: { isDeleted: false } },
        select: { id: true },
    })
    if (!existing) {
        return { status: false, message: 'Blog bulunamadı' }
    }

    const post = await prisma.post.update({
        where: { id: postId },
        data: { status },
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    return { status: true, message: 'Blog durumu güncellendi', post }
}

export async function deletePost(input: z.input<typeof getPostSchema>): Promise<DeletePostResponse> {
    const auth = await authorize('post:delete')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getPostSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const existing = await prisma.post.findFirst({
        where: { id: parsed.data.postId, isDeleted: false },
        select: { id: true, customerId: true },
    })
    if (!existing) {
        return { status: false, message: 'Blog bulunamadı' }
    }

    // Soft delete only
    await prisma.post.update({
        where: { id: existing.id },
        data: { isDeleted: true },
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/blogs', 'layout')
    return { status: true, message: 'Blog silindi', href: `/app/customers/${existing.customerId}/blogs` }
}
