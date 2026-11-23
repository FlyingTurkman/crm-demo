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

// Single notes open under their customer (/app/customers/[id]/notes/[noteId]/edit),
// so this section only has the list and the add page
export default function NotesBreadcrumb() {
    const pathname = usePathname()
    const isAddPage = pathname === '/app/notes/add'

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
                        <BreadcrumbLink render={<Link href='/app/notes' />}>Notlar</BreadcrumbLink>
                    ) : (
                        <BreadcrumbPage>Notlar</BreadcrumbPage>
                    )}
                </BreadcrumbItem>
                {isAddPage && (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Yeni Not</BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                )}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
