'use client'

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { UserDto } from '@/dtos/userDTO'

type SiteContextValue = {
    user: UserDto | null
    setUser: Dispatch<SetStateAction<UserDto | null>>
}

const SiteContext = createContext<SiteContextValue | null>(null)

// Wraps the whole app (app/layout.tsx). initialUser comes from getCurrentUser() on the server.
export function SiteProvider({ children, initialUser }: { children: ReactNode, initialUser: UserDto | null }) {
    const [user, setUser] = useState<UserDto | null>(initialUser)

    return (
        <SiteContext value={{ user, setUser }}>
            {children}
        </SiteContext>
    )
}

export function useSiteContext() {
    const context = useContext(SiteContext)

    if (!context) {
        throw new Error('useSiteContext must be used inside SiteProvider')
    }

    return context
}
