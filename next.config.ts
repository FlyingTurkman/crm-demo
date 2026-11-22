import type { NextConfig } from 'next'

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

const nextConfig: NextConfig = {
    async headers() {
        return [
            { source: '/api/v1/:path*', headers: apiCorsHeaders },
        ]
    },
}

export default nextConfig
