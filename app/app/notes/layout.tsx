import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { getRecentNotes } from '@/actions/note'
import NotesBreadcrumb from '@/components/app/notes/NotesBreadcrumb'
import NoteSearchBar from '@/components/app/notes/NoteSearchBar'
import NotesSidebar from '@/components/app/notes/NotesSidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function NotesLayout({
    children
}: {
    children: ReactNode
}) {
    // shadcn's sidebar remembers its open / collapsed state in this cookie
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
    const result = await getRecentNotes()

    return (
        <SidebarProvider defaultOpen={defaultOpen} className='min-h-[calc(100svh-3.5rem)]'>
            <NotesSidebar notes={result.notes ?? []} />
            <SidebarInset>
                {/* On mobile the breadcrumb wraps to its own row */}
                <div className='flex flex-wrap items-center gap-2 border-b p-2'>
                    <SidebarTrigger />
                    <div className='shrink-0'>
                        <NoteSearchBar />
                    </div>
                    <Separator orientation='vertical' className='hidden h-4 md:block' />
                    <div className='w-full min-w-0 md:w-auto md:flex-1'>
                        <NotesBreadcrumb />
                    </div>
                </div>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}
