import { postImageTypes } from '@/lib/src/constants'

// Client-safe image helpers: only the public bucket URL is used here, never the credentials

export type PostImageType = keyof typeof postImageTypes

// Public URL of an S3 object key
export function getImageUrl(key: string) {
    const baseUrl = (process.env.NEXT_PUBLIC_AWS_S3_BUCKET_URL ?? '').replace(/\/+$/, '')
    return `${baseUrl}/${key}`
}

// The file's real type from its first bytes. The browser's `type` is sent by the client, so it
// can't be trusted: a renamed .html file must not be stored as an image.
export function detectImageType(bytes: Uint8Array): PostImageType | null {
    function startsWith(signature: number[], offset = 0) {
        return signature.every(function (byte, index) {
            return bytes[offset + index] === byte
        })
    }

    if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
    if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
    if (startsWith([0x47, 0x49, 0x46, 0x38])) return 'image/gif'
    // RIFF....WEBP
    if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
    return null
}

export function formatFileSize(size: number) {
    if (size < 1024 * 1024) {
        return `${Math.max(1, Math.round(size / 1024))} KB`
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
