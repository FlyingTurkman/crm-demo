'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IoDocumentText, IoList, IoNewspaper } from 'react-icons/io5'
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
import type { Post } from '@/types'

const sidebarItems = [
    { href: '/app/blogs', label: 'Blog Listesi', icon: IoList },
]

export default function BlogsSidebar({ posts }: { posts: Post[] }) {
    const pathname = usePathname()

    return (
        // Sits below the sticky MainMenu (h-14) instead of covering it
        <Sidebar collapsible='icon' className='top-14 h-[calc(100svh-3.5rem)]'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size='lg' tooltip='Bloglar' render={<Link href='/app/blogs' />}>
                            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                                <IoNewspaper />
                            </div>
                            <span className='font-semibold'>Bloglar</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Blog İşlemleri</SidebarGroupLabel>
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
                                    Henüz blog yok
                                </p>
                            )}
                            {posts.map((post) => (
                                <SidebarMenuItem key={post.id}>
                                    <SidebarMenuButton
                                        size='lg'
                                        tooltip={post.title}
                                        render={<Link href={`/app/customers/${post.customerId}/blogs/${post.id}`} />}
                                    >
                                        <IoDocumentText />
                                        <div className='grid flex-1 leading-tight'>
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
}
