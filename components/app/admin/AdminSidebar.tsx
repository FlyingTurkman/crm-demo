'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoList, IoPersonAdd, IoShieldCheckmark } from 'react-icons/io5'
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
import type { ManagedUserDto } from '@/dtos/userDTO'
import { userRoleLabels } from '@/lib/src/constants'

const sidebarItems = [
    { href: '/app/admin', label: 'Kullanıcı Listesi', icon: IoList },
    { href: '/app/admin/add', label: 'Yeni Kullanıcı', icon: IoPersonAdd },
]

export default function AdminSidebar({ users }: { users: ManagedUserDto[] }) {
    const pathname = usePathname()

    return (
        // Sits below the sticky MainMenu (h-14) instead of covering it
        <Sidebar collapsible='icon' className='top-14 h-[calc(100svh-3.5rem)]'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' tooltip='Admin Paneli' render={<Link href='/app/admin' />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <IoShieldCheckmark />
                            </div>
                            <span className='font-semibold'>Admin Paneli</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Kullanıcı İşlemleri</SidebarGroupLabel>
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
                            {users.map((user) => (
                                <SidebarMenuItem key={user.id}>
                                    <SidebarMenuButton
                                        size='lg'
                                        isActive={pathname.startsWith(`/app/admin/${user.id}`)}
                                        tooltip={user.fullName}
                                        render={<Link href={`/app/admin/${user.id}/edit`} />}
                                    >
                                        <Avatar size='sm'>
                                            <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                        </Avatar>
                                        <div className='grid flex-1 leading-tight'>
                                            <span className='truncate'>{user.fullName}</span>
                                            <span className='truncate text-xs text-muted-foreground'>
                                                {userRoleLabels[user.role]}
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

    function getInitials(user: ManagedUserDto) {
        return `${user.name.charAt(0)}${user.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
