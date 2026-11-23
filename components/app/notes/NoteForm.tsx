'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createNote, updateNote } from '@/actions/note'
import CustomerPicker from '@/components/app/customers/CustomerPicker'
import type { RichTextValue } from '@/components/app/editor/RichTextEditor'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { maxNoteContentLength } from '@/lib/src/constants'
import type { Customer, Note } from '@/types'

// The editor parses HTML with DOMParser, so it can only render in the browser
const RichTextEditor = dynamic(function () {
    return import('@/components/app/editor/RichTextEditor')
}, {
    ssr: false,
    loading: EditorSkeleton,
})

type NoteFormValues = {
    body: RichTextValue
    // Only used when the form picks the customer itself (no customerId given)
    customer: Customer | null
}

// Used by the add and the edit pages: edits when `note` is given.
// Without `customerId` (the notes section's add page) the customer is picked in the form.
export default function NoteForm({ customerId, note }: { customerId?: string, note?: Note }) {
    const router = useRouter()
    const picksCustomer = !customerId && !note
    const cancelHref = picksCustomer ? '/app/notes' : `/app/customers/${customerId ?? note?.customerId}/notes`
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<NoteFormValues>({
        defaultValues: {
            body: { content: note?.content ?? '', rawContent: note?.rawContent ?? '' },
            customer: null,
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
                        {picksCustomer && (
                            <Field data-invalid={Boolean(errors.customer)}>
                                <FieldLabel htmlFor='customer' className='required'>Müşteri</FieldLabel>
                                <Controller
                                    name='customer'
                                    control={control}
                                    rules={{
                                        validate: function (value) {
                                            return Boolean(value) || 'Müşteri seçin'
                                        },
                                    }}
                                    render={function ({ field }) {
                                        return (
                                            <CustomerPicker
                                                id='customer'
                                                value={field.value}
                                                onChange={field.onChange}
                                                isInvalid={Boolean(errors.customer)}
                                            />
                                        )
                                    }}
                                />
                                <FieldError errors={[errors.customer]} />
                            </Field>
                        )}

                        <Field data-invalid={Boolean(errors.body)}>
                            <FieldLabel className='required'>Not</FieldLabel>
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
                    <Link href={cancelHref} className={buttonVariants({ variant: 'outline' })}>
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
        const targetCustomerId = customerId ?? values.customer?.id ?? ''
        const result = note
            ? await updateNote({ noteId: note.id, ...input })
            : await createNote({ customerId: targetCustomerId, ...input })

        if (!result.status) {
            toast.error(result.message ?? 'Not kaydedilemedi')
            return
        }

        toast.success(result.message ?? 'Not kaydedildi')
        router.push(result.href ?? `/app/customers/${targetCustomerId}/notes`)
    }
}

function EditorSkeleton() {
    return (
        <Skeleton className='h-72 w-full' />
    )
}
