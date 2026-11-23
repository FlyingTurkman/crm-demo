'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { paginate } from '@/lib/pagination'
import { authorize } from '@/lib/auth/authorize'
import { sanitizeRichTextHtml } from '@/lib/richText'
import { getPeriodWhere, type CreatedPeriod } from '@/lib/period'
import { getSearchWhere } from '@/lib/search'
import {
    createdPeriods,
    maxNoteContentLength,
    maxRawContentLength,
    maxSearchLength,
    noteSorts,
    objectIdPattern,
    pageLimit,
    searchResultLimit,
    sidebarNoteLimit,
} from '@/lib/src/constants'
import type { Note, Response } from '@/types'

const customerIdField = z.string().regex(objectIdPattern, 'Geçersiz müşteri')
const noteIdField = z.string().regex(objectIdPattern, 'Geçersiz not')

const noteFields = {
    // Plain text output of the editor (serializeToPlainText)
    content: z
        .string()
        .refine(function (value) {
            return value.trim().length > 0
        }, 'Not zorunludur')
        .refine(function (value) {
            return value.length <= maxNoteContentLength
        }, `Not en fazla ${maxNoteContentLength} karakter olabilir`),
    // HTML output of the editor (serializeToHtml), sanitized before saving
    rawContent: z
        .string()
        .max(maxRawContentLength, 'Not çok büyük'),
}

// Search, sort and page of note lists
const noteListFields = {
    query: z
        .string()
        .trim()
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`)
        .optional(),
    period: z.enum(createdPeriods, 'Geçersiz tarih aralığı').optional(),
    sort: z.enum(noteSorts, 'Geçersiz sıralama').default('updated'),
    page: z.coerce.number().int().min(1, 'Geçersiz sayfa').default(1),
}

const getNotesSchema = z.object({
    customerId: customerIdField,
    ...noteListFields,
})

const getAllNotesSchema = z.object(noteListFields)

const searchNotesSchema = z.object({
    query: z
        .string()
        .trim()
        .min(1, 'Arama metni boş olamaz')
        .max(maxSearchLength, `Arama metni en fazla ${maxSearchLength} karakter olabilir`),
})

type NoteSort = (typeof noteSorts)[number]

const noteOrderBy: Record<NoteSort, Prisma.NoteOrderByWithRelationInput> = {
    updated: { updatedAt: 'desc' },
    created: { createdAt: 'desc' },
}

function getNoteListWhere(query: string | undefined, period?: CreatedPeriod): Prisma.NoteWhereInput {
    return {
        isDeleted: false,
        customer: { isDeleted: false },
        ...getPeriodWhere(period),
        // Searches the plain text version, so styling doesn't get in the way
        // (Turkish-insensitive, see lib/src/searchText.ts)
        ...getSearchWhere(query),
    }
}

const getNoteSchema = z.object({
    noteId: noteIdField,
})

const createNoteSchema = z.object({
    customerId: customerIdField,
    ...noteFields,
})

const updateNoteSchema = z.object({
    noteId: noteIdField,
    ...noteFields,
})

type GetNotesResponse = Response & {
    notes?: Note[]
    total?: number
    page?: number
    pageCount?: number
}

type GetAllNotesResponse = Response & {
    notes?: Note[]
    total?: number
    page?: number
    pageCount?: number
}

type GetRecentNotesResponse = Response & {
    notes?: Note[]
}

type SearchNotesResponse = Response & {
    notes?: Note[]
}

type GetNoteResponse = Response & {
    note?: Note
}

type CreateNoteResponse = Response & {
    note?: Note
    href?: string
}

type UpdateNoteResponse = Response & {
    note?: Note
    href?: string
}

type DeleteNoteResponse = Response & {
    href?: string
}

export async function getNotes(input: z.input<typeof getNotesSchema>): Promise<GetNotesResponse> {
    const auth = await authorize('note:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getNotesSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId, query, period, sort, page } = parsed.data
    const where: Prisma.NoteWhereInput = {
        ...getNoteListWhere(query, period),
        customerId,
    }

    const result = await paginate(page, function () {
        return prisma.note.count({ where })
    }, function (skip) {
        return prisma.note.findMany({
            where,
            orderBy: noteOrderBy[sort],
            skip,
            take: pageLimit,
        })
    })
    const notes = result.items
    return { status: true, notes, total: result.total, page: result.page, pageCount: result.pageCount }
}

// Notes of all customers, for /app/notes
export async function getAllNotes(input: z.input<typeof getAllNotesSchema>): Promise<GetAllNotesResponse> {
    const auth = await authorize('note:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getAllNotesSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { query, period, sort, page } = parsed.data
    const where = getNoteListWhere(query, period)

    const result = await paginate(page, function () {
        return prisma.note.count({ where })
    }, function (skip) {
        return prisma.note.findMany({
            where,
            orderBy: noteOrderBy[sort],
            skip,
            take: pageLimit,
            include: { customer: true },
        })
    })
    const notes = result.items
    return { status: true, notes, total: result.total, page: result.page, pageCount: result.pageCount }
}

export async function getRecentNotes(): Promise<GetRecentNotesResponse> {
    const auth = await authorize('note:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const notes = await prisma.note.findMany({
        where: getNoteListWhere(undefined),
        orderBy: { updatedAt: 'desc' },
        take: sidebarNoteLimit,
        include: { customer: true },
    })
    return { status: true, notes }
}

export async function searchNotes(input: z.input<typeof searchNotesSchema>): Promise<SearchNotesResponse> {
    const auth = await authorize('note:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = searchNotesSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const notes = await prisma.note.findMany({
        where: getNoteListWhere(parsed.data.query),
        orderBy: { updatedAt: 'desc' },
        take: searchResultLimit,
        include: { customer: true },
    })
    return { status: true, notes }
}

export async function getNote(input: z.input<typeof getNoteSchema>): Promise<GetNoteResponse> {
    const auth = await authorize('note:read')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getNoteSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const note = await prisma.note.findFirst({
        where: { id: parsed.data.noteId, isDeleted: false, customer: { isDeleted: false } },
    })
    if (!note) {
        return { status: false, message: 'Not bulunamadı' }
    }
    return { status: true, note }
}

export async function createNote(input: z.input<typeof createNoteSchema>): Promise<CreateNoteResponse> {
    const auth = await authorize('note:create')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = createNoteSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { customerId, content, rawContent } = parsed.data

    const customer = await prisma.customer.findFirst({
        where: { id: customerId, isDeleted: false },
        select: { id: true },
    })
    if (!customer) {
        return { status: false, message: 'Müşteri bulunamadı' }
    }

    const note = await prisma.note.create({
        data: {
            customerId,
            content,
            rawContent: sanitizeRichTextHtml(rawContent),
        },
    })

    // 'layout' also refreshes the note counts in the customer header
    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/notes', 'layout')
    return { status: true, message: 'Not oluşturuldu', note, href: `/app/customers/${customerId}/notes` }
}

export async function updateNote(input: z.input<typeof updateNoteSchema>): Promise<UpdateNoteResponse> {
    const auth = await authorize('note:update')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = updateNoteSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { noteId, content, rawContent } = parsed.data

    const existing = await prisma.note.findFirst({
        where: { id: noteId, isDeleted: false, customer: { isDeleted: false } },
        select: { id: true },
    })
    if (!existing) {
        return { status: false, message: 'Not bulunamadı' }
    }

    const note = await prisma.note.update({
        where: { id: noteId },
        data: {
            content,
            rawContent: sanitizeRichTextHtml(rawContent),
        },
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/notes', 'layout')
    return { status: true, message: 'Not güncellendi', note, href: `/app/customers/${note.customerId}/notes` }
}

export async function deleteNote(input: z.input<typeof getNoteSchema>): Promise<DeleteNoteResponse> {
    const auth = await authorize('note:delete')
    if (!auth.user) {
        return { status: false, message: auth.message }
    }

    const parsed = getNoteSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const existing = await prisma.note.findFirst({
        where: { id: parsed.data.noteId, isDeleted: false },
        select: { id: true, customerId: true },
    })
    if (!existing) {
        return { status: false, message: 'Not bulunamadı' }
    }

    // Soft delete only
    await prisma.note.update({
        where: { id: existing.id },
        data: { isDeleted: true },
    })

    revalidatePath('/app/customers', 'layout')
    revalidatePath('/app/notes', 'layout')
    return { status: true, message: 'Not silindi', href: `/app/customers/${existing.customerId}/notes` }
}
