'use client'

import Link from 'next/link'
import { IoHome } from 'react-icons/io5'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Single blogs open under their customer (/app/customers/[id]/blogs/[postId]),
// so this section only has the list page
export default function BlogsBreadcrumb() {
    return (
        <Breadcrumb className='min-w-0'>
            <BreadcrumbList className='md:flex-nowrap'>
                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href='/app' aria-label='Ana Sayfa' />}>
                        <IoHome className='size-4' />
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>Bloglar</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    )
}
