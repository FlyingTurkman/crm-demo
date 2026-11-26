import type { NextRequest } from 'next/server'
import { uploadPostImage } from '@/actions/post'
import { apiError, apiResult, requireApiToken } from '@/lib/api'

// POST /api/v1/images  multipart/form-data with a `file` field (one image).
// Returns { image: { key, name, contentType, size }, url }: send { key, name } in a post's `images`.
export async function POST(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return apiError('İstek gövdesi multipart/form-data olmalıdır (file alanı)', 400)
    }
    return apiResult(await uploadPostImage(formData), 201)
}
