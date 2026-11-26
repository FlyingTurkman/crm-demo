'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { IoClose, IoImages } from 'react-icons/io5'
import { toast } from 'sonner'
import { uploadPostImage } from '@/actions/post'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatFileSize, getImageUrl } from '@/lib/images'
import { maxPostImages, maxPostImageSize, maxPostImageSizeMb, postImageTypes } from '@/lib/src/constants'
import type { PostImage } from '@/types'

const acceptedTypes = Object.keys(postImageTypes).join(',')

// Images of a post: each picked file is uploaded to S3 right away (uploadPostImage),
// the form keeps only the returned keys and saves them with the post.
export default function PostImagesField({
    id,
    value,
    onChange
}: {
    id?: string
    value: PostImage[]
    onChange: (images: PostImage[]) => void
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploadingCount, setUploadingCount] = useState(0)
    const isUploading = uploadingCount > 0
    const isFull = value.length >= maxPostImages

    return (
        <div className='flex flex-col gap-3'>
            {value.length > 0 && (
                <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                    {value.map((image) => (
                        <li key={image.key} className='group relative overflow-hidden rounded-lg border bg-muted'>
                            <div className='relative aspect-square'>
                                <Image
                                    src={getImageUrl(image.key)}
                                    alt={image.name}
                                    fill
                                    sizes='(min-width: 1024px) 12rem, 50vw'
                                    className='object-cover'
                                />
                            </div>
                            <div className='flex flex-col px-2 py-1 text-xs'>
                                <span className='truncate' title={image.name}>{image.name}</span>
                                <span className='text-muted-foreground'>{formatFileSize(image.size)}</span>
                            </div>
                            <Button
                                type='button'
                                variant='secondary'
                                size='icon-sm'
                                className='absolute top-1 right-1'
                                aria-label={`${image.name} görselini kaldır`}
                                onClick={function () {
                                    handleRemove(image.key)
                                }}
                            >
                                <IoClose />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <div className='flex flex-wrap items-center gap-3'>
                <Button
                    id={id}
                    type='button'
                    variant='outline'
                    disabled={isUploading || isFull}
                    onClick={handlePick}
                >
                    {isUploading ? <Spinner /> : <IoImages />}
                    {isUploading ? `Yükleniyor (${uploadingCount})...` : 'Görsel Ekle'}
                </Button>
                <p className='text-xs text-muted-foreground'>
                    JPG, PNG, WEBP veya GIF · en fazla {maxPostImageSizeMb} MB · {value.length}/{maxPostImages} görsel
                </p>
            </div>

            <input
                ref={inputRef}
                type='file'
                accept={acceptedTypes}
                multiple
                className='hidden'
                onChange={handleFiles}
            />
        </div>
    )

    function handlePick() {
        inputRef.current?.click()
    }

    function handleRemove(key: string) {
        onChange(value.filter(function (image) {
            return image.key !== key
        }))
    }

    async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        // Picking the same file again must fire onChange too
        e.target.value = ''

        const room = maxPostImages - value.length
        if (files.length > room) {
            toast.error(`En fazla ${maxPostImages} görsel eklenebilir`)
        }
        const accepted = files.slice(0, room).filter(function (file) {
            if (file.size > maxPostImageSize) {
                toast.error(`${file.name}: görsel en fazla ${maxPostImageSizeMb} MB olabilir`)
                return false
            }
            return true
        })
        if (accepted.length === 0) {
            return
        }

        setUploadingCount(accepted.length)
        const uploaded: PostImage[] = []
        // One by one: every request stays under the Server Action body limit
        for (const file of accepted) {
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadPostImage(formData)
            setUploadingCount(function (count) {
                return count - 1
            })

            if (!result.status || !result.image) {
                toast.error(`${file.name}: ${result.message ?? 'Görsel yüklenemedi'}`)
                continue
            }
            uploaded.push(result.image)
        }

        if (uploaded.length > 0) {
            onChange([...value, ...uploaded])
            toast.success(uploaded.length === 1 ? 'Görsel yüklendi' : `${uploaded.length} görsel yüklendi`)
        }
    }
}
