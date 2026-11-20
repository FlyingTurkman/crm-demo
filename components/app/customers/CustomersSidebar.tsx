'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoList, IoPeople, IoPersonAdd } from 'react-icons/io5'
import type { Customer } from '@/types'
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

const sidebarItems = [
    { href: '/app/customers', label: 'Müşteri Listesi', icon: IoList },
    { href: '/app/customers/add', label: 'Yeni Müşteri', icon: IoPersonAdd },
]

export default function CustomersSidebar({ customers }: { customers: Customer[] }) {
    const pathname = usePathname()

    return (
        // Sits below the sticky MainMenu (h-14) instead of covering it
        <Sidebar collapsible='icon' className='top-14 h-[calc(100svh-3.5rem)]'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' tooltip='Müşteriler' render={<Link href='/app/customers' />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <IoPeople />
                            </div>
                            <span className='font-semibold'>Müşteriler</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Müşteri İşlemleri</SidebarGroupLabel>
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
                            {customers.length === 0 && (
                                <p className='px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
                                    Henüz müşteri yok
                                </p>
                            )}
                            {customers.map((customer) => (
                                <SidebarMenuItem key={customer.id}>
                                    <SidebarMenuButton
                                        size='lg'
                                        isActive={pathname.startsWith(`/app/customers/${customer.id}`)}
                                        tooltip={customer.fullName}
                                        render={<Link href={`/app/customers/${customer.id}`} />}
                                    >
                                        <Avatar size='sm'>
                                            <AvatarFallback>{getInitials(customer)}</AvatarFallback>
                                        </Avatar>
                                        <div className='grid flex-1 leading-tight'>
                                            <span className='truncate'>{customer.fullName}</span>
                                            <span className='truncate text-xs text-muted-foreground'>
                                                {customer.company ?? customer.email}
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

    function getInitials(customer: Customer) {
        return `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toLocaleUpperCase('tr-TR')
    }
}
