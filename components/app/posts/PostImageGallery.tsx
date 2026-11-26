'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getImageUrl } from '@/lib/images'
import type { PostImage } from '@/types'

// Thumbnails of a post's images, a click opens the image large
export default function PostImageGallery({ images }: { images: PostImage[] }) {
    const [openImage, setOpenImage] = useState<PostImage | null>(null)

    if (images.length === 0) {
        return null
    }

    return (
        <>
            <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                {images.map((image) => (
                    <li key={image.key}>
                        <button
                            type='button'
                            className='relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                            aria-label={`${image.name} görselini büyüt`}
                            onClick={function () {
                                setOpenImage(image)
                            }}
                        >
                            <Image
                                src={getImageUrl(image.key)}
                                alt={image.name}
                                fill
                                sizes='(min-width: 1024px) 14rem, 50vw'
                                className='object-cover transition-transform hover:scale-105'
                            />
                        </button>
                    </li>
                ))}
            </ul>

            <Dialog open={Boolean(openImage)} onOpenChange={handleOpenChange}>
                <DialogContent className='sm:max-w-3xl'>
                    <DialogTitle className='truncate pr-8'>{openImage?.name}</DialogTitle>
                    {openImage && (
                        <div className='relative h-[70vh] w-full'>
                            <Image
                                src={getImageUrl(openImage.key)}
                                alt={openImage.name}
                                fill
                                sizes='(min-width: 768px) 48rem, 100vw'
                                className='object-contain'
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )

    function handleOpenChange(open: boolean) {
        if (!open) {
            setOpenImage(null)
        }
    }
}
