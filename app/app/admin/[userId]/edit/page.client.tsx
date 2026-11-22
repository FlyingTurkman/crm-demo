'use client'

import { regenerateApiToken, type ApiTokenInfo } from '@/actions/apiToken'
import UserForm from '@/components/app/admin/UserForm'
import ApiTokenCard from '@/components/app/apiToken/ApiTokenCard'
import type { ManagedUserDto } from '@/dtos/userDTO'

export default function EditUserPageClient({
    user,
    apiToken
}: {
    user: ManagedUserDto
    apiToken: ApiTokenInfo | null
}) {
    return (
        <div className='flex flex-col items-center gap-4 p-4'>
            <UserForm user={user} />
            <ApiTokenCard apiToken={apiToken} onRegenerate={handleRegenerate} />
        </div>
    )

    function handleRegenerate() {
        return regenerateApiToken({ userId: user.id })
    }
}
