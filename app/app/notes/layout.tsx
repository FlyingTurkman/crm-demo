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
                <div className='flex items-center gap-2 border-b p-2'>
                    <SidebarTrigger />
                    <div className='shrink-0'>
                        <NoteSearchBar />
                    </div>
                    <Separator orientation='vertical' className='h-4' />
                    <NotesBreadcrumb />
                </div>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}
