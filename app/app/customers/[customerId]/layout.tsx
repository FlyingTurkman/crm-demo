import { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CustomerActionsMenu from '@/components/app/customers/CustomerActionsMenu'
import CustomerMenu from '@/components/app/customers/CustomerMenu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getCustomerCached } from '@/lib/data'

export default async function CustomerLayout({
    children,
    params
}: {
    children: ReactNode
    params: Promise<{ customerId: string }>
}) {
    const { customerId } = await params
    const result = await getCustomerCached(customerId)

    if (!result.customer) {
        notFound()
    }

    const customer = result.customer
    const initials = `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between'>
                <Link href={`/app/customers/${customer.id}`} className='flex items-center gap-3'>
                    <Avatar size='lg'>
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className='grid leading-tight'>
                        <span className='text-xl font-semibold'>{customer.fullName}</span>
                        <span className='text-sm text-muted-foreground'>{customer.company ?? customer.email}</span>
                    </div>
                </Link>
                <div className='flex flex-row flex-wrap gap-2'>
                    <CustomerMenu customer={customer} />
                    <CustomerActionsMenu customer={customer} />
                </div>
            </div>
            {children}
        </div>
    )
}
