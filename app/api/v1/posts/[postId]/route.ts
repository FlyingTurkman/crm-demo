import type { NextRequest } from 'next/server'
import { deletePost, getPost, updatePost, updatePostStatus } from '@/actions/post'
import { apiResult, invalidBodyError, readJsonBody, requireApiToken, withRichText } from '@/lib/api'
import { toDateParam, toDateTimeValue } from '@/lib/period'

type Context = { params: Promise<{ postId: string }> }
type UpdatePostInput = Parameters<typeof updatePost>[0]
type UpdatePostStatusInput = Parameters<typeof updatePostStatus>[0]

// GET /api/v1/posts/{postId}
export async function GET(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { postId } = await params
    return apiResult(await getPost({ postId }))
}

// PATCH /api/v1/posts/{postId}: only the sent fields change. { status } alone only changes the status.
export async function PATCH(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    const { postId } = await params
    const keys = Object.keys(body)
    if (keys.length === 1 && keys[0] === 'status') {
        return apiResult(await updatePostStatus({ status: body.status, postId } as UpdatePostStatusInput))
    }

    const current = await getPost({ postId })
    if (!current.post) return apiResult(current)

    const { post } = current
    const result = await updatePost({
        title: post.title,
        status: post.status,
        type: post.type,
        platforms: post.platforms,
        dueDate: post.dueDate ? toDateParam(new Date(post.dueDate)) : '',
        scheduledAt: post.scheduledAt ? toDateTimeValue(new Date(post.scheduledAt)) : '',
        assigneeId: post.assigneeId ?? '',
        images: post.images.map((image) => ({ key: image.key, name: image.name })),
        content: post.content,
        rawContent: post.rawContent,
        ...withRichText(body),
        postId,
    } as UpdatePostInput)
    return apiResult(result)
}

// DELETE /api/v1/posts/{postId}: soft delete
export async function DELETE(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { postId } = await params
    return apiResult(await deletePost({ postId }))
}
