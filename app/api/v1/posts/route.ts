import type { NextRequest } from 'next/server'
import { getAllPosts } from '@/actions/post'
import { apiResult, getQueryParam, requireApiToken } from '@/lib/api'

type GetAllPostsInput = Parameters<typeof getAllPosts>[0]

// GET /api/v1/posts?q=&status=&type=&platform=&due=&assignee=&period=&sort=&page=  (posts of all customers)
// New posts are created under their customer: POST /api/v1/customers/{customerId}/posts
export async function GET(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const result = await getAllPosts({
        query: getQueryParam(request, 'q'),
        status: getQueryParam(request, 'status'),
        type: getQueryParam(request, 'type'),
        platform: getQueryParam(request, 'platform'),
        due: getQueryParam(request, 'due'),
        assignee: getQueryParam(request, 'assignee'),
        period: getQueryParam(request, 'period'),
        sort: getQueryParam(request, 'sort'),
        page: getQueryParam(request, 'page'),
    } as GetAllPostsInput)
    return apiResult(result)
}
