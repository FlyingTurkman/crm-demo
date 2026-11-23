'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
// so this section only has the list and the add page
export default function BlogsBreadcrumb() {
    const pathname = usePathname()
    const isAddPage = pathname === '/app/blogs/add'

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
                    {isAddPage ? (
                        <BreadcrumbLink render={<Link href='/app/blogs' />}>Bloglar</BreadcrumbLink>
                    ) : (
                        <BreadcrumbPage>Bloglar</BreadcrumbPage>
                    )}
                </BreadcrumbItem>
                {isAddPage && (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Yeni Blog</BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                )}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
