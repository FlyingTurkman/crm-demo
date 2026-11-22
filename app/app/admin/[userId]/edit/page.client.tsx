'use client'

import UserForm from '@/components/app/admin/UserForm'
import type { ManagedUserDto } from '@/dtos/userDTO'

export default function EditUserPageClient({ user }: { user: ManagedUserDto }) {
    return (
        <div className='flex justify-center p-4'>
            <UserForm user={user} />
        </div>
    )
}
