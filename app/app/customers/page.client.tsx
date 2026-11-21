'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { IoPersonAdd } from 'react-icons/io5'
import type { PostStatus } from '@prisma/client'
import ListFilters from '@/components/app/common/ListFilters'
import ListPagination from '@/components/app/common/ListPagination'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { createdPeriodLabels, customerSortLabels, customerSorts, pageLimit, postStatusLabels } from '@/lib/src/constants'
import type { CreatedPeriod } from '@/lib/period'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types'

type CustomerListFilters = {
    query: string
    period?: CreatedPeriod
    postStatus?: PostStatus
    sort: (typeof customerSorts)[number]
}

const postStatusFilterLabels: Record<string, string> = {
    all: 'Tüm müşteriler',
    draft: `${postStatusLabels.draft} blogu olanlar`,
    inReview: `${postStatusLabels.inReview} blogu olanlar`,
    published: `${postStatusLabels.published} blogu olanlar`,
}

export default function CustomersPageClient({
    customers,
    total,
    page,
    pageCount,
    filters,
    errorMessage
}: {
    customers: Customer[]
    total: number
    page: number
    pageCount: number
    filters: CustomerListFilters
    errorMessage?: string
}) {
    // Shared by filters and pagination: dims the table while the next page loads
    const [isPending, startTransition] = useTransition()
    const hasFilters = Boolean(filters.query || filters.postStatus || filters.period)
    const firstIndex = total === 0 ? 0 : (page - 1) * pageLimit + 1
    const lastIndex = Math.min(page * pageLimit, total)

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Müşteriler</h1>
                    <p className='text-sm text-muted-foreground'>
                        {total === 0 ? 'Gösterilecek müşteri yok' : `${total} müşteriden ${firstIndex}-${lastIndex} arası gösteriliyor`}
                    </p>
                </div>
                <Link href='/app/customers/add' className={buttonVariants()}>
                    <IoPersonAdd /> Yeni Müşteri
                </Link>
            </div>

            <ListFilters
                query={filters.query}
                placeholder='Ad, email, telefon veya firma...'
                selects={[
                    {
                        param: 'status',
                        value: filters.postStatus ?? 'all',
                        defaultValue: 'all',
                        items: postStatusFilterLabels,
                        label: 'Blog durumuna göre filtrele',
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
                        items: customerSortLabels,
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
                            <TableHead>Müşteri</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className='hidden md:table-cell'>Telefon</TableHead>
                            <TableHead className='hidden lg:table-cell'>Firma</TableHead>
                            <TableHead className='text-right'>Blog</TableHead>
                            <TableHead className='text-right'>Not</TableHead>
                            <TableHead className='hidden md:table-cell'>Son Güncelleme</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className='py-8 text-center text-muted-foreground'>
                                    {hasFilters ? 'Filtrelere uyan müşteri bulunamadı' : 'Henüz müşteri yok'}
                                </TableCell>
                            </TableRow>
                        )}
                        {customers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell>
                                    <Link href={`/app/customers/${customer.id}`} className='flex items-center gap-2 font-medium hover:underline'>
                                        <Avatar size='sm'>
                                            <AvatarFallback>{getInitials(customer)}</AvatarFallback>
                                        </Avatar>
                                        {customer.fullName}
                                    </Link>
                                </TableCell>
                                <TableCell className='text-muted-foreground'>{customer.email}</TableCell>
                                <TableCell className='hidden text-muted-foreground md:table-cell'>{customer.phone ?? '-'}</TableCell>
                                <TableCell className='hidden text-muted-foreground lg:table-cell'>{customer.company ?? '-'}</TableCell>
                                <TableCell className='text-right tabular-nums'>{customer._count?.posts ?? 0}</TableCell>
                                <TableCell className='text-right tabular-nums'>{customer._count?.notes ?? 0}</TableCell>
                                <TableCell className='hidden text-muted-foreground md:table-cell'>{formatDate(customer.updatedAt)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ListPagination page={page} pageCount={pageCount} startTransition={startTransition} />
        </div>
    )

    function getInitials(customer: Customer) {
        return `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
