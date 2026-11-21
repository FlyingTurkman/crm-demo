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

// Single notes open under their customer (/app/customers/[id]/notes/[noteId]/edit),
// so this section only has the list page
export default function NotesBreadcrumb() {
    return (
        <Breadcrumb className='min-w-0'>
            <BreadcrumbList className='flex-nowrap'>
                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href='/app' aria-label='Ana Sayfa' />}>
                        <IoHome className='size-4' />
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>Notlar</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    )
}
