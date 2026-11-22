'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { UserRole } from '@prisma/client'
import { IoPersonAdd } from 'react-icons/io5'
import { deleteUser } from '@/actions/user'
import UserRoleBadge from '@/components/app/admin/UserRoleBadge'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import { useSiteContext } from '@/components/app/context/SiteContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ManagedUserDto } from '@/dtos/userDTO'
import { formatDate } from '@/lib/format'
import type { CreatedPeriod } from '@/lib/period'
import { createdPeriodLabels, pageLimit, userRoleLabels, userSortLabels, userSorts } from '@/lib/src/constants'
import { cn } from '@/lib/utils'

type UserListFilters = {
    query: string
    role?: UserRole
    period?: CreatedPeriod
    sort: (typeof userSorts)[number]
}

const roleFilterLabels: Record<string, string> = {
    all: 'Tüm roller',
    ...userRoleLabels,
}

export default function AdminPageClient({
    users,
    total,
    page,
    pageCount,
    filters,
    errorMessage
}: {
    users: ManagedUserDto[]
    total: number
    page: number
    pageCount: number
    filters: UserListFilters
    errorMessage?: string
}) {
    const { user: currentUser } = useSiteContext()
    // Shared by filters and pagination: dims the table while the next page loads
    const [isPending, startTransition] = useTransition()
    const hasFilters = Boolean(filters.query || filters.role || filters.period)
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Kullanıcılar</h1>
                    <p className='text-sm text-muted-foreground'>
                        {total === 0 ? 'Gösterilecek kullanıcı yok' : `${total} kullanıcıdan ${firstIndex}-${lastIndex} arası gösteriliyor`}
                    </p>
                </div>
                <Link href='/app/admin/add' className={buttonVariants()}>
                    <IoPersonAdd /> Yeni Kullanıcı
                </Link>
            </div>

            <ListFilters
                query={filters.query}
                placeholder='Ad veya email...'
                selects={[
                    {
                        param: 'role',
                        value: filters.role ?? 'all',
                        defaultValue: 'all',
                        items: roleFilterLabels,
                        label: 'Role göre filtrele',
                        className: 'lg:w-40',
                    },
                    {
                        param: 'period',
                        value: filters.period ?? 'all',
                        defaultValue: 'all',
                        items: createdPeriodLabels,
                        label: 'Eklenme zamanı',
                        className: 'lg:w-44',
                    },
                    {
                        param: 'sort',
                        value: filters.sort,
                        defaultValue: 'updated',
                        items: userSortLabels,
                        label: 'Sıralama',
                        className: 'lg:w-48',
                    },
                ]}
                isPending={isPending}
                startTransition={startTransition}
            />

            {errorMessage && (
                <p className='text-sm text-destructive'>{errorMessage}</p>
            )}

            <div className={cn('rounded-lg border transition-opacity', isPending && 'opacity-60')}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kullanıcı</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead className='hidden md:table-cell'>Kayıt Tarihi</TableHead>
                            <TableHead className='w-0' />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                                    {hasFilters ? 'Filtrelere uyan kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
                                </TableCell>
                            </TableRow>
                        )}
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Link href={`/app/admin/${user.id}/edit`} className='flex items-center gap-2 font-medium hover:underline'>
                                        <Avatar size='sm'>
                                            <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                        </Avatar>
                                        {user.fullName}
                                        {user.id === currentUser?.id && <Badge variant='outline'>Siz</Badge>}
                                    </Link>
                                </TableCell>
                                <TableCell className='text-muted-foreground'>{user.email}</TableCell>
                                <TableCell>
                                    <UserRoleBadge role={user.role} />
                                </TableCell>
                                <TableCell className='hidden text-muted-foreground md:table-cell'>{formatDate(user.createdAt)}</TableCell>
                                <TableCell>
                                    <EditDeleteMenu
                                        size='sm'
                                        editLabel='Kullanıcıyı Düzenle'
                                        editHref={`/app/admin/${user.id}/edit`}
                                        deleteDescription={`${user.fullName} adlı kullanıcı silinecek ve açık oturumları kapatılacak.`}
                                        deletePermission='user:delete'
                                        canDelete={user.id !== currentUser?.id}
                                        onDelete={function () {
                                            return deleteUser({ userId: user.id })
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ListPagination page={page} pageCount={pageCount} startTransition={startTransition} />
        </div>
    )

    function getInitials(user: ManagedUserDto) {
        return `${user.name.charAt(0)}${user.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
