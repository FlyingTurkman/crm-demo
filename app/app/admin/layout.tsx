import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getRecentUsers } from '@/actions/user'
import AdminBreadcrumb from '@/components/app/admin/AdminBreadcrumb'
import AdminSidebar from '@/components/app/admin/AdminSidebar'
import UserSearchBar from '@/components/app/admin/UserSearchBar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { hasPermission } from '@/lib/auth/permissions'
import { getCurrentUser } from '@/lib/auth/session'

export default async function AdminLayout({
    children
}: {
    children: ReactNode
}) {
    // Admins only: moderators get a 404 even if they type the URL (actions check it again)
    const user = await getCurrentUser()
    if (!hasPermission(user?.role, 'user:read')) {
        notFound()
    }

    // shadcn's sidebar remembers its open / collapsed state in this cookie
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
    const result = await getRecentUsers()

    return (
        <SidebarProvider defaultOpen={defaultOpen} className='min-h-[calc(100svh-3.5rem)]'>
            <AdminSidebar users={result.users ?? []} />
            <SidebarInset>
                {/* On mobile the breadcrumb wraps to its own row */}
                <div className='flex flex-wrap items-center gap-2 border-b p-2'>
                    <SidebarTrigger />
                    <div className='shrink-0'>
                        <UserSearchBar />
                    </div>
                    <Separator orientation='vertical' className='hidden h-4 md:block' />
                    <div className='w-full min-w-0 md:w-auto md:flex-1'>
                        <AdminBreadcrumb />
                    </div>
                </div>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}
