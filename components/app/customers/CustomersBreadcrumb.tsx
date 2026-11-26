'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoHome } from 'react-icons/io5'
import { getCustomer } from '@/actions/customer'
import { getPost } from '@/actions/post'
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
    // null while the customer name / blog title is being loaded
    label: string | null
}

const basePath = '/app/customers'

// Builds the trail from the URL, e.g. /app/customers/[id]/blogs/[postId]/edit
// → Müşteriler / Ahmet Yılmaz / Bloglar / <blog title> / Düzenle
function getCrumbs(pathname: string, labels: Record<string, string>): Crumb[] {
    const parts = pathname.slice(basePath.length).split('/').filter(Boolean)
    const crumbs: Crumb[] = [{ href: basePath, label: 'Müşteriler' }]
    const [customerId, section, itemId, action] = parts

    if (!customerId) {
        return crumbs
    }
    if (customerId === 'add') {
        crumbs.push({ href: `${basePath}/add`, label: 'Yeni Müşteri' })
        return crumbs
    }

    const customerHref = `${basePath}/${customerId}`
    crumbs.push({ href: customerHref, label: labels[customerId] ?? null })

    if (section === 'edit') {
        crumbs.push({ href: `${customerHref}/edit`, label: 'Bilgileri Düzenle' })
        return crumbs
    }

    if (section === 'blogs') {
        const blogsHref = `${customerHref}/blogs`
        crumbs.push({ href: blogsHref, label: 'İçerikler' })

        if (itemId === 'add') {
            crumbs.push({ href: `${blogsHref}/add`, label: 'Yeni İçerik' })
        } else if (itemId) {
            crumbs.push({ href: `${blogsHref}/${itemId}`, label: labels[itemId] ?? null })
            if (action === 'edit') {
                crumbs.push({ href: `${blogsHref}/${itemId}/edit`, label: 'Düzenle' })
            }
        }
    }

    if (section === 'notes') {
        const notesHref = `${customerHref}/notes`
        crumbs.push({ href: notesHref, label: 'Notlar' })

        if (itemId === 'add') {
            crumbs.push({ href: `${notesHref}/add`, label: 'Yeni Not' })
        } else if (itemId && action === 'edit') {
            // Notes have no title, so the edit page is the last crumb
            crumbs.push({ href: `${notesHref}/${itemId}/edit`, label: 'Notu Düzenle' })
        }
    }

    return crumbs
}

export default function CustomersBreadcrumb() {
    const pathname = usePathname()
    // Customer names and blog titles by id
    const [labels, setLabels] = useState<Record<string, string>>({})
    const crumbs = getCrumbs(pathname, labels).map((crumb, index) => ({
        ...crumb,
        id: `${index}-${crumb.href}`,
    }))
    const parts = pathname.slice(basePath.length).split('/').filter(Boolean)
    const customerId = objectIdPattern.test(parts[0] ?? '') ? parts[0] : undefined
    const postId = parts[1] === 'blogs' && objectIdPattern.test(parts[2] ?? '') ? parts[2] : undefined

    // Reloaded on every navigation so a renamed customer / blog shows its new name
    useEffect(function () {
        let isCancelled = false

        if (customerId) {
            getCustomer({ customerId }).then(function (result) {
                if (!isCancelled && result.customer) {
                    addLabel(customerId, result.customer.fullName)
                }
            })
        }
        if (postId) {
            getPost({ postId }).then(function (result) {
                if (!isCancelled && result.post) {
                    addLabel(postId, result.post.title)
                }
            })
        }

        return function () {
            isCancelled = true
        }
    }, [pathname, customerId, postId])

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
                                // Clickable even while the name is still loading
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

    function addLabel(id: string, label: string) {
        setLabels(function (previous) {
            return { ...previous, [id]: label }
        })
    }
}
