'use client'

import { useState } from 'react'
import { IoCalendar, IoMail } from 'react-icons/io5'
import type { Profile } from '@/actions/profile'
import { regenerateMyApiToken } from '@/actions/profile'
import UserRoleBadge from '@/components/app/admin/UserRoleBadge'
import ApiTokenCard from '@/components/app/apiToken/ApiTokenCard'
import { useSiteContext } from '@/components/app/context/SiteContext'
import ChangePasswordForm from '@/components/app/profile/ChangePasswordForm'
import ProfileForm from '@/components/app/profile/ProfileForm'
import SessionsCard from '@/components/app/profile/SessionsCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/format'

const demoLockedReason = 'Bu bir demo hesabı: herkes kullanabilsin diye şifresi ve oturumları değiştirilemez.'

export default function ProfilePageClient({
    profile,
    errorMessage
}: {
    profile?: Profile
    errorMessage?: string
}) {
    const { user: contextUser } = useSiteContext()
    const [otherSessionCount, setOtherSessionCount] = useState(profile?.otherSessionCount ?? 0)

    if (!profile) {
        return (
            <p className='p-4 text-sm text-destructive'>{errorMessage ?? 'Profil yüklenemedi'}</p>
        )
    }

    // The context has the latest name right after the profile form is saved
    const user = contextUser && contextUser.id === profile.user.id ? contextUser : profile.user
    const lockedReason = profile.isDemo ? demoLockedReason : undefined
    const initials = `${user.name.charAt(0)}${user.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')

    return (
        <div className='container mx-auto flex max-w-4xl flex-col gap-6 p-4'>
            <h1 className='text-2xl font-semibold'>Profilim</h1>

            <Card>
                <CardContent className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                    <Avatar className='size-16 text-xl'>
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className='flex min-w-0 flex-col gap-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='text-xl font-semibold'>{user.fullName}</h2>
                            <UserRoleBadge role={user.role} />
                        </div>
                        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <IoMail aria-hidden /> <span className='break-all'>{user.email}</span>
                        </p>
                        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <IoCalendar aria-hidden /> {formatDate(user.createdAt)} tarihinden beri üye
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className='grid gap-6 lg:grid-cols-2'>
                <ProfileForm user={profile.user} />
                <ChangePasswordForm lockedReason={lockedReason} onChanged={handleSessionsClosed} />
                <ApiTokenCard
                    className='max-w-none'
                    apiToken={profile.apiToken}
                    onRegenerate={regenerateMyApiToken}
                />
                <SessionsCard otherSessionCount={otherSessionCount} lockedReason={lockedReason} onClosed={handleSessionsClosed} />
            </div>
        </div>
    )

    function handleSessionsClosed() {
        setOtherSessionCount(0)
    }
}
