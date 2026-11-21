'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createNote, updateNote } from '@/actions/note'
import type { RichTextValue } from '@/components/app/editor/RichTextEditor'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { maxNoteContentLength } from '@/lib/src/constants'
import type { Note } from '@/types'

// The editor parses HTML with DOMParser, so it can only render in the browser
const RichTextEditor = dynamic(function () {
    return import('@/components/app/editor/RichTextEditor')
}, {
    ssr: false,
    loading: EditorSkeleton,
})

type NoteFormValues = {
    body: RichTextValue
}

// Used by both the add and the edit page: edits when `note` is given
export default function NoteForm({ customerId, note }: { customerId: string, note?: Note }) {
    const router = useRouter()
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<NoteFormValues>({
        defaultValues: {
            body: { content: note?.content ?? '', rawContent: note?.rawContent ?? '' },
        },
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{note ? 'Notu Düzenle' : 'Yeni Not'}</CardTitle>
                <CardDescription>Müşteriyle ilgili notunuzu yazın.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent>
                    <FieldGroup>
                        <Field data-invalid={Boolean(errors.body)}>
                            <FieldLabel>Not *</FieldLabel>
                            <Controller
                                name='body'
                                control={control}
                                rules={{
                                    validate: function (value) {
                                        if (value.content.trim().length === 0) {
                                            return 'Not zorunludur'
                                        }
                                        if (value.content.length > maxNoteContentLength) {
                                            return `Not en fazla ${maxNoteContentLength} karakter olabilir`
                                        }
                                        return true
                                    },
                                }}
                                render={function ({ field }) {
                                    return (
                                        <RichTextEditor
                                            defaultRawContent={note?.rawContent}
                                            maxLength={maxNoteContentLength}
                                            placeholder='Notunuzu yazın...'
                                            onChange={field.onChange}
                                        />
                                    )
                                }}
                            />
                            <FieldError errors={[errors.body]} />
                        </Field>
                    </FieldGroup>
                </CardContent>
                <CardFooter className='mt-6 justify-end gap-2'>
                    <Link href={`/app/customers/${customerId}/notes`} className={buttonVariants({ variant: 'outline' })}>
                        İptal
                    </Link>
                    <Button type='submit' disabled={isSubmitting}>
                        {isSubmitting && <Spinner />}
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )

    async function onSubmit(values: NoteFormValues) {
        const input = {
            content: values.body.content,
            rawContent: values.body.rawContent,
        }
        const result = note
            ? await updateNote({ noteId: note.id, ...input })
            : await createNote({ customerId, ...input })

        if (!result.status) {
            toast.error(result.message ?? 'Not kaydedilemedi')
            return
        }

        toast.success(result.message ?? 'Not kaydedildi')
        router.push(result.href ?? `/app/customers/${customerId}/notes`)
    }
}

function EditorSkeleton() {
    return (
        <Skeleton className='h-72 w-full' />
    )
}
