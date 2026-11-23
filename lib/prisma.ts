import { PrismaClient } from '@prisma/client'
import { searchTextExtension } from '@/lib/src/searchText'

function createPrismaClient() {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        // Internal search index (lib/src/searchText.ts): never read back, never sent to clients
        omit: {
            customer: { searchText: true },
            post: { searchText: true },
            note: { searchText: true },
            user: { searchText: true },
        },
    }).$extends(searchTextExtension)
}

// Reuse a single PrismaClient across hot reloads in development
// to avoid exhausting MongoDB connections. The key names the client's setup: a renamed key
// keeps a dev server from reusing a client cached before the setup changed.
const globalForPrisma = globalThis as unknown as { prismaWithSearchText?: ReturnType<typeof createPrismaClient> }

export const prisma = globalForPrisma.prismaWithSearchText ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaWithSearchText = prisma
