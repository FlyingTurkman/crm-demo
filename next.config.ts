import type { NextConfig } from 'next'
import { maxPostImageSizeMb } from './lib/src/constants'

// CORS of the REST API: any site can call it from the browser. This is safe because the API
// authenticates only with 'Authorization: Bearer <token>' and never reads cookies, so a
// foreign site can't act with a visitor's session (no Access-Control-Allow-Credentials).
const apiCorsHeaders = [
    { key: 'Access-Control-Allow-Origin', value: '*' },
    { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
    { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
    { key: 'Access-Control-Expose-Headers', value: 'WWW-Authenticate' },
    // Browsers cache the preflight (OPTIONS) answer for a day
    { key: 'Access-Control-Max-Age', value: '86400' },
]

// Post images are served from the S3 bucket (lib/images.ts), next/image only loads that host
const bucketUrl = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_URL
const bucketHost = bucketUrl ? new URL(bucketUrl).hostname : undefined

const nextConfig: NextConfig = {
    images: {
        remotePatterns: bucketHost ? [{ protocol: 'https', hostname: bucketHost, pathname: '/posts/**' }] : [],
    },
    experimental: {
        // Images are uploaded through a Server Action (uploadPostImage): one image plus form overhead
        serverActions: {
            bodySizeLimit: `${maxPostImageSizeMb + 1}mb`,
        },
    },
    async headers() {
        return [
            { source: '/api/v1/:path*', headers: apiCorsHeaders },
        ]
    },
}

export default nextConfig
