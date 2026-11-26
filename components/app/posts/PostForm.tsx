'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PostPlatform, PostStatus, PostType } from '@prisma/client'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createPost, updatePost } from '@/actions/post'
import CustomerPicker from '@/components/app/customers/CustomerPicker'
import DueDatePicker from '@/components/app/posts/DueDatePicker'
import PostImagesField from '@/components/app/posts/PostImagesField'
import PostPlatformIcon from '@/components/app/posts/PostPlatformIcon'
import ScheduleField from '@/components/app/posts/ScheduleField'
import type { RichTextValue } from '@/components/app/editor/RichTextEditor'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toDateParam, toDateTimeValue } from '@/lib/period'
import { maxPostContentLength, maxPostTitleLength, postPlatformLabels, postStatusLabels, postTypeLabels } from '@/lib/src/constants'
import type { PublicUserDto } from '@/dtos/userDTO'
import type { Customer, Post, PostImage } from '@/types'

// The editor parses HTML with DOMParser, so it can only render in the browser
const RichTextEditor = dynamic(function () {
    return import('@/components/app/editor/RichTextEditor')
}, {
    ssr: false,
    loading: EditorSkeleton,
})

const postStatuses: PostStatus[] = ['draft', 'inReview', 'published']
const postTypes = Object.keys(postTypeLabels) as PostType[]
const postPlatforms = Object.keys(postPlatformLabels) as PostPlatform[]
// Select value of 'no assignee' (Base UI's Select needs a non-empty value for every item)
const noAssignee = 'none'

type PostFormValues = {
    title: string
    status: PostStatus
    type: PostType
    platforms: PostPlatform[]
    // YYYY-MM-DD, '' when there is none
    dueDate: string
    // YYYY-MM-DDTHH:mm, '' when there is none
    scheduledAt: string
    // User id or noAssignee
    assigneeId: string
    images: PostImage[]
    body: RichTextValue
    // Only used when the form picks the customer itself (no customerId given)
    customer: Customer | null
}

// Used by the add and the edit pages: edits when `post` is given.
// Without `customerId` (the content section's add page) the customer is picked in the form.
// `users` are the system users a post can be assigned to (getPostAssignees).
// `initialScheduledAt` prefills the publish time of a new post (the agenda's "+" buttons).
export default function PostForm({
    customerId,
    post,
    users,
    initialScheduledAt
}: {
    customerId?: string
    post?: Post
    users: PublicUserDto[]
    initialScheduledAt?: string
}) {
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
            type: post?.type ?? 'socialMedia',
            platforms: post?.platforms ?? [],
            dueDate: post?.dueDate ? toDateParam(new Date(post.dueDate)) : '',
            scheduledAt: post?.scheduledAt ? toDateTimeValue(new Date(post.scheduledAt)) : initialScheduledAt ?? '',
            assigneeId: post?.assigneeId ?? noAssignee,
            images: post?.images ?? [],
            body: { content: post?.content ?? '', rawContent: post?.rawContent ?? '' },
            customer: null,
        },
    })

    const assigneeLabels: Record<string, string> = { [noAssignee]: 'Atanmadı' }
    users.forEach(function (user) {
        assigneeLabels[user.id] = user.fullName
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{post ? 'İçeriği Düzenle' : 'Yeni İçerik'}</CardTitle>
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

                        <div className='grid gap-4 sm:grid-cols-3'>
                            <Field>
                                <FieldLabel>Tür</FieldLabel>
                                <Controller
                                    name='type'
                                    control={control}
                                    render={function ({ field }) {
                                        return (
                                            <Select
                                                items={postTypeLabels}
                                                value={field.value}
                                                onValueChange={function (value) {
                                                    if (value) {
                                                        field.onChange(value)
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className='w-full' aria-label='İçerik türü'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {postTypes.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {postTypeLabels[type]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )
                                    }}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor='dueDate'>Teslim Tarihi</FieldLabel>
                                <Controller
                                    name='dueDate'
                                    control={control}
                                    render={function ({ field }) {
                                        return (
                                            <DueDatePicker id='dueDate' value={field.value} onChange={field.onChange} />
                                        )
                                    }}
                                />
                            </Field>

                            <Field>
                                <FieldLabel>Sorumlu</FieldLabel>
                                <Controller
                                    name='assigneeId'
                                    control={control}
                                    render={function ({ field }) {
                                        return (
                                            <Select
                                                items={assigneeLabels}
                                                value={field.value}
                                                onValueChange={function (value) {
                                                    field.onChange(value ?? noAssignee)
                                                }}
                                            >
                                                <SelectTrigger className='w-full' aria-label='Sorumlu'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(assigneeLabels).map(([id, label]) => (
                                                        <SelectItem key={id} value={id}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )
                                    }}
                                />
                            </Field>
                        </div>

                        <Field>
                            <FieldLabel htmlFor='scheduledAt'>Yayın Zamanı</FieldLabel>
                            <Controller
                                name='scheduledAt'
                                control={control}
                                render={function ({ field }) {
                                    return (
                                        <ScheduleField id='scheduledAt' value={field.value} onChange={field.onChange} />
                                    )
                                }}
                            />
                            <FieldDescription>İçeriğin planlanan yayın tarihi ve saati; Ajanda&apos;da bu zamanda görünür.</FieldDescription>
                        </Field>

                        <Field>
                            <FieldLabel>Kanallar</FieldLabel>
                            <Controller
                                name='platforms'
                                control={control}
                                render={function ({ field }) {
                                    return (
                                        <ToggleGroup
                                            multiple
                                            variant='outline'
                                            size='sm'
                                            className='w-full flex-wrap'
                                            aria-label='İçeriğin üretildiği kanallar'
                                            value={field.value}
                                            onValueChange={function (value) {
                                                field.onChange(value as PostPlatform[])
                                            }}
                                        >
                                            {postPlatforms.map((platform) => (
                                                <ToggleGroupItem key={platform} value={platform}>
                                                    <PostPlatformIcon platform={platform} /> {postPlatformLabels[platform]}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    )
                                }}
                            />
                            <FieldDescription>İçeriğin yayınlanacağı yerler, birden fazla seçilebilir.</FieldDescription>
                        </Field>

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
                                            placeholder='İçerik metnini yazın...'
                                            onChange={field.onChange}
                                        />
                                    )
                                }}
                            />
                            <FieldError errors={[errors.body]} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='images'>Görseller</FieldLabel>
                            <Controller
                                name='images'
                                control={control}
                                render={function ({ field }) {
                                    return (
                                        <PostImagesField id='images' value={field.value} onChange={field.onChange} />
                                    )
                                }}
                            />
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
            type: values.type,
            platforms: values.platforms,
            dueDate: values.dueDate,
            scheduledAt: values.scheduledAt,
            assigneeId: values.assigneeId === noAssignee ? '' : values.assigneeId,
            images: values.images.map((image) => ({ key: image.key, name: image.name })),
            content: values.body.content,
            rawContent: values.body.rawContent,
        }
        const targetCustomerId = customerId ?? values.customer?.id ?? ''
        const result = post
            ? await updatePost({ postId: post.id, ...input })
            : await createPost({ customerId: targetCustomerId, ...input })

        if (!result.status) {
            toast.error(result.message ?? 'İçerik kaydedilemedi')
            return
        }

        toast.success(result.message ?? 'İçerik kaydedildi')
        router.push(result.href ?? `/app/customers/${targetCustomerId}/blogs`)
    }
}

function EditorSkeleton() {
    return (
        <Skeleton className='h-72 w-full' />
    )
}
