'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoHome } from 'react-icons/io5'
import { getUser } from '@/actions/user'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { objectIdPattern } from '@/lib/src/constants'

type Crumb = {
    href: string
    // null while the user's name is being loaded
    label: string | null
}

const basePath = '/app/admin'

// /app/admin → Admin Paneli, /app/admin/add → … / Yeni Kullanıcı,
// /app/admin/[userId]/edit → … / <name> / Düzenle
function getCrumbs(pathname: string, userName: string | null): Crumb[] {
    const [first, action] = pathname.slice(basePath.length).split('/').filter(Boolean)
    const crumbs: Crumb[] = [{ href: basePath, label: 'Admin Paneli' }]

    if (first === 'add') {
        crumbs.push({ href: `${basePath}/add`, label: 'Yeni Kullanıcı' })
    } else if (first) {
        crumbs.push({ href: `${basePath}/${first}/edit`, label: userName })
        if (action === 'edit') {
            crumbs.push({ href: `${basePath}/${first}/edit`, label: 'Düzenle' })
        }
    }
    return crumbs
}

export default function AdminBreadcrumb() {
    const pathname = usePathname()
    const [userNames, setUserNames] = useState<Record<string, string>>({})
    const first = pathname.slice(basePath.length).split('/').filter(Boolean)[0]
    const userId = objectIdPattern.test(first ?? '') ? first : undefined
    const crumbs = getCrumbs(pathname, userId ? userNames[userId] ?? null : null).map((crumb, index) => ({
        ...crumb,
        id: `${index}-${crumb.href}`,
    }))

    // Reloaded on every navigation so a renamed user shows the new name
    useEffect(function () {
        let isCancelled = false

        if (userId) {
            getUser({ userId }).then(function (result) {
                if (!isCancelled && result.user) {
                    const fullName = result.user.fullName
                    setUserNames(function (previous) {
                        return { ...previous, [userId]: fullName }
                    })
                }
            })
        }

        return function () {
            isCancelled = true
        }
    }, [pathname, userId])

    return (
        <Breadcrumb className='min-w-0'>
            <BreadcrumbList className='md:flex-nowrap'>
                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href='/app' aria-label='Ana Sayfa' />}>
                        <IoHome className='size-4' />
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {crumbs.map((crumb, index) => (
                    <Fragment key={crumb.id}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem className='min-w-0'>
                            {index === crumbs.length - 1 ? (
                                <BreadcrumbPage className='max-w-48 truncate'>
                                    {crumb.label ?? <Skeleton className='h-4 w-24' />}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink className='max-w-40 truncate' render={<Link href={crumb.href} />}>
                                    {crumb.label ?? <Skeleton className='h-4 w-24' />}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
