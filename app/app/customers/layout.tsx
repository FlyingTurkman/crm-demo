import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { getRecentCustomers } from '@/actions/customer'
import CustomerSearchBar from '@/components/app/customers/CustomerSearchBar'
import CustomersSidebar from '@/components/app/customers/CustomersSidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function CustomersLayout({
    children
}: {
    children: ReactNode
}) {
    // shadcn's sidebar remembers its open / collapsed state in this cookie
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
    const result = await getRecentCustomers()

    return (
        <SidebarProvider defaultOpen={defaultOpen} className='min-h-[calc(100svh-3.5rem)]'>
            <CustomersSidebar customers={result.customers ?? []} />
            <SidebarInset>
                <div className='flex items-center gap-2 border-b p-2'>
                    <SidebarTrigger />
                    <CustomerSearchBar />
                </div>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}
