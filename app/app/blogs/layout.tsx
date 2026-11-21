import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { getRecentPosts } from '@/actions/post'
import BlogsBreadcrumb from '@/components/app/blogs/BlogsBreadcrumb'
import BlogSearchBar from '@/components/app/blogs/BlogSearchBar'
import BlogsSidebar from '@/components/app/blogs/BlogsSidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function BlogsLayout({
    children
}: {
    children: ReactNode
}) {
    // shadcn's sidebar remembers its open / collapsed state in this cookie
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
    const result = await getRecentPosts()

    return (
        <SidebarProvider defaultOpen={defaultOpen} className='min-h-[calc(100svh-3.5rem)]'>
            <BlogsSidebar posts={result.posts ?? []} />
            <SidebarInset>
                <div className='flex items-center gap-2 border-b p-2'>
                    <SidebarTrigger />
                    <div className='shrink-0'>
                        <BlogSearchBar />
                    </div>
                    <Separator orientation='vertical' className='h-4' />
                    <BlogsBreadcrumb />
                </div>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}
