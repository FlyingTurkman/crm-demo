'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PostStatus } from '@prisma/client'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createPost, updatePost } from '@/actions/post'
import CustomerPicker from '@/components/app/customers/CustomerPicker'
import type { RichTextValue } from '@/components/app/editor/RichTextEditor'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { maxPostContentLength, maxPostTitleLength, postStatusLabels } from '@/lib/src/constants'
import type { Customer, Post } from '@/types'

// The editor parses HTML with DOMParser, so it can only render in the browser
const RichTextEditor = dynamic(function () {
    return import('@/components/app/editor/RichTextEditor')
}, {
    ssr: false,
    loading: EditorSkeleton,
})

const postStatuses: PostStatus[] = ['draft', 'inReview', 'published']

type PostFormValues = {
    title: string
    status: PostStatus
    body: RichTextValue
    // Only used when the form picks the customer itself (no customerId given)
    customer: Customer | null
}

// Used by the add and the edit pages: edits when `post` is given.
// Without `customerId` (the blogs section's add page) the customer is picked in the form.
export default function PostForm({ customerId, post }: { customerId?: string, post?: Post }) {
    const router = useRouter()
    const picksCustomer = !customerId && !post
    let cancelHref = picksCustomer ? '/app/blogs' : `/app/customers/${customerId}/blogs`
    if (post) {
        cancelHref = `/app/customers/${post.customerId}/blogs/${post.id}`
    }
    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<PostFormValues>({
        defaultValues: {
            title: post?.title ?? '',
            status: post?.status ?? 'draft',
            body: { content: post?.content ?? '', rawContent: post?.rawContent ?? '' },
            customer: null,
        },
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{post ? 'Blogu Düzenle' : 'Yeni Blog'}</CardTitle>
                <CardDescription>
                    {picksCustomer ? 'Müşteri, başlık ve içerik zorunludur.' : 'Başlık ve içerik zorunludur.'}
                </CardDescription>
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

                        <div className='grid gap-4 sm:grid-cols-[1fr_12rem]'>
                            <Field data-invalid={Boolean(errors.title)}>
                                <FieldLabel htmlFor='title' className='required'>Başlık</FieldLabel>
                                <Input
                                    id='title'
                                    aria-invalid={Boolean(errors.title)}
                                    {...register('title', {
                                        validate: function (value) {
                                            return value.trim().length > 0 || 'Başlık zorunludur'
                                        },
                                        maxLength: {
                                            value: maxPostTitleLength,
                                            message: `Başlık en fazla ${maxPostTitleLength} karakter olabilir`,
                                        },
                                    })}
                                />
                                <FieldError errors={[errors.title]} />
                            </Field>

                            <Field>
                                <FieldLabel>Durum</FieldLabel>
                                <Controller
                                    name='status'
                                    control={control}
                                    render={function ({ field }) {
                                        return (
                                            <Select
                                                items={postStatusLabels}
                                                value={field.value}
                                                onValueChange={function (value) {
                                                    if (value) {
                                                        field.onChange(value)
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className='w-full'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {postStatuses.map((status) => (
                                                        <SelectItem key={status} value={status}>
                                                            {postStatusLabels[status]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )
                                    }}
                                />
                            </Field>
                        </div>

                        <Field data-invalid={Boolean(errors.body)}>
                            <FieldLabel className='required'>İçerik</FieldLabel>
                            <Controller
                                name='body'
                                control={control}
                                rules={{
                                    validate: function (value) {
                                        if (value.content.trim().length === 0) {
                                            return 'İçerik zorunludur'
                                        }
                                        if (value.content.length > maxPostContentLength) {
                                            return `İçerik en fazla ${maxPostContentLength} karakter olabilir`
                                        }
                                        return true
                                    },
                                }}
                                render={function ({ field }) {
                                    return (
                                        <RichTextEditor
                                            defaultRawContent={post?.rawContent}
                                            maxLength={maxPostContentLength}
                                            placeholder='Blog içeriğini yazın...'
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

    async function onSubmit(values: PostFormValues) {
        const input = {
            title: values.title,
            status: values.status,
            content: values.body.content,
            rawContent: values.body.rawContent,
        }
        const targetCustomerId = customerId ?? values.customer?.id ?? ''
        const result = post
            ? await updatePost({ postId: post.id, ...input })
            : await createPost({ customerId: targetCustomerId, ...input })

        if (!result.status) {
            toast.error(result.message ?? 'Blog kaydedilemedi')
            return
        }

        toast.success(result.message ?? 'Blog kaydedildi')
        router.push(result.href ?? `/app/customers/${targetCustomerId}/blogs`)
    }
}

function EditorSkeleton() {
    return (
        <Skeleton className='h-72 w-full' />
    )
}
