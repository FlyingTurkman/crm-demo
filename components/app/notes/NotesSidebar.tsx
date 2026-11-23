'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoAdd, IoDocumentText, IoDocuments, IoList } from 'react-icons/io5'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import type { Customer, Note } from '@/types'

const sidebarItems = [
    { href: '/app/notes', label: 'Not Listesi', icon: IoList },
    { href: '/app/notes/add', label: 'Yeni Not', icon: IoAdd },
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
                                        <IoDocumentText className='group-data-[collapsible=icon]:hidden' />
                                        {/* Collapsed (icon) sidebar: the customer's avatar replaces the icon and the text,
                                            which would otherwise squeeze into one letter per line */}
                                        <Avatar size='sm' className='hidden group-data-[collapsible=icon]:flex'>
                                            <AvatarFallback>{getInitials(note.customer)}</AvatarFallback>
                                        </Avatar>
                                        <div className='grid flex-1 leading-tight group-data-[collapsible=icon]:hidden'>
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

    function getInitials(customer: Customer | undefined) {
        if (!customer) {
            return '?'
        }
        return `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
