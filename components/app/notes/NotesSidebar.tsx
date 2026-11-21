'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoDocumentText, IoDocuments, IoList } from 'react-icons/io5'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar'
import { getNotePreview } from '@/lib/format'
import type { Note } from '@/types'

const sidebarItems = [
    { href: '/app/notes', label: 'Not Listesi', icon: IoList },
]

export default function NotesSidebar({ notes }: { notes: Note[] }) {
    const pathname = usePathname()

    return (
        // Sits below the sticky MainMenu (h-14) instead of covering it
        <Sidebar collapsible='icon' className='top-14 h-[calc(100svh-3.5rem)]'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' tooltip='Notlar' render={<Link href='/app/notes' />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <IoDocuments />
                            </div>
                            <span className='font-semibold'>Notlar</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Not İşlemleri</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {sidebarItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.href}
                                        tooltip={item.label}
                                        render={<Link href={item.href} />}
                                    >
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Son Güncellenenler</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {notes.length === 0 && (
                                <p className='px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
                                    Henüz not yok
                                </p>
                            )}
                            {notes.map((note) => (
                                <SidebarMenuItem key={note.id}>
                                    <SidebarMenuButton
                                        size='lg'
                                        tooltip={getNotePreview(note.content)}
                                        render={<Link href={`/app/customers/${note.customerId}/notes/${note.id}/edit`} />}
                                    >
                                        <IoDocumentText />
                                        <div className='grid flex-1 leading-tight'>
                                            <span className='truncate'>{getNotePreview(note.content)}</span>
                                            <span className='truncate text-xs text-muted-foreground'>
                                                {note.customer?.fullName}
                                            </span>
                                        </div>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
