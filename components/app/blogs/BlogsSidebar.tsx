'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoAdd, IoDocumentText, IoList, IoNewspaper } from 'react-icons/io5'
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
import type { Customer, Post } from '@/types'

const sidebarItems = [
    { href: '/app/blogs', label: 'İçerik Listesi', icon: IoList },
    { href: '/app/blogs/add', label: 'Yeni İçerik', icon: IoAdd },
]

export default function BlogsSidebar({ posts }: { posts: Post[] }) {
    const pathname = usePathname()

    return (
        // Sits below the sticky MainMenu (h-14) instead of covering it
        <Sidebar collapsible='icon' className='top-14 h-[calc(100svh-3.5rem)]'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' tooltip='İçerikler' render={<Link href='/app/blogs' />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <IoNewspaper />
                            </div>
                            <span className='font-semibold'>İçerikler</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>İçerik İşlemleri</SidebarGroupLabel>
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
                            {posts.length === 0 && (
                                <p className='px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
                                    Henüz içerik yok
                                </p>
                            )}
                            {posts.map((post) => (
                                <SidebarMenuItem key={post.id}>
                                    <SidebarMenuButton
                                        size='lg'
                                        tooltip={post.title}
                                        render={<Link href={`/app/customers/${post.customerId}/blogs/${post.id}`} />}
                                    >
                                        <IoDocumentText className='group-data-[collapsible=icon]:hidden' />
                                        {/* Collapsed (icon) sidebar: the customer's avatar replaces the icon and the text,
                                            which would otherwise squeeze into one letter per line */}
                                        <Avatar size='sm' className='hidden group-data-[collapsible=icon]:flex'>
                                            <AvatarFallback>{getInitials(post.customer)}</AvatarFallback>
                                        </Avatar>
                                        <div className='grid flex-1 leading-tight group-data-[collapsible=icon]:hidden'>
                                            <span className='truncate'>{post.title}</span>
                                            <span className='truncate text-xs text-muted-foreground'>
                                                {post.customer?.fullName}
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
