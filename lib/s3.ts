import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

// Server-side S3 access (post images). Credentials come from .env and never reach the client:
// the browser only gets the public object URL (lib/images.ts).

const globalForS3 = globalThis as unknown as { s3Client?: S3Client }

function getClient() {
    if (!globalForS3.s3Client) {
        globalForS3.s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
            },
        })
    }
    return globalForS3.s3Client
}

function getBucket() {
    const bucket = process.env.AWS_S3_BUCKET_NAME
    if (!bucket) {
        throw new Error('AWS_S3_BUCKET_NAME tanımlı değil')
    }
    return bucket
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
    await getClient().send(new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are random and never overwritten, so browsers may cache them forever
        CacheControl: 'public, max-age=31536000, immutable',
    }))
}

// Size and type of an object, or null when it doesn't exist
export async function headObject(key: string) {
    try {
        const result = await getClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }))
        return { size: result.ContentLength ?? 0, contentType: result.ContentType ?? '' }
    } catch {
        return null
    }
}
