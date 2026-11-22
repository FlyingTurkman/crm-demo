import type { NextRequest } from 'next/server'
import { createPost, getPosts } from '@/actions/post'
import { apiResult, getQueryParam, invalidBodyError, readJsonBody, requireApiToken, withRichText } from '@/lib/api'

type Context = { params: Promise<{ customerId: string }> }
type GetPostsInput = Parameters<typeof getPosts>[0]
type CreatePostInput = Parameters<typeof createPost>[0]

// GET /api/v1/customers/{customerId}/posts?q=&status=&sort=&page=
export async function GET(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { customerId } = await params
    const result = await getPosts({
        customerId,
        query: getQueryParam(request, 'q'),
        status: getQueryParam(request, 'status'),
        sort: getQueryParam(request, 'sort'),
        page: getQueryParam(request, 'page'),
    } as GetPostsInput)
    return apiResult(result)
}

// POST /api/v1/customers/{customerId}/posts  { title, status?, rawContent and / or content }
export async function POST(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    const { customerId } = await params
    const result = await createPost({
        status: 'draft',
        ...withRichText(body),
        customerId,
    } as CreatePostInput)
    return apiResult(result, 201)
}
