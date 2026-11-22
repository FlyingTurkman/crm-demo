import type { NextRequest } from 'next/server'
import { deleteNote, getNote, updateNote } from '@/actions/note'
import { apiResult, invalidBodyError, readJsonBody, requireApiToken, withRichText } from '@/lib/api'

type Context = { params: Promise<{ noteId: string }> }
type UpdateNoteInput = Parameters<typeof updateNote>[0]

// GET /api/v1/notes/{noteId}
export async function GET(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { noteId } = await params
    return apiResult(await getNote({ noteId }))
}

// PATCH /api/v1/notes/{noteId}  { rawContent and / or content }
export async function PATCH(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    const { noteId } = await params
    const current = await getNote({ noteId })
    if (!current.note) return apiResult(current)

    const { note } = current
    const result = await updateNote({
        content: note.content,
        rawContent: note.rawContent,
        ...withRichText(body),
        noteId,
    } as UpdateNoteInput)
    return apiResult(result)
}

// DELETE /api/v1/notes/{noteId}: soft delete
export async function DELETE(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { noteId } = await params
    return apiResult(await deleteNote({ noteId }))
}
