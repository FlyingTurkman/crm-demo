'use client'

import { usePathname, useRouter } from 'next/navigation'
import { IoAdd, IoChevronDown, IoDocumentText, IoList, IoNewspaper } from 'react-icons/io5'
import { buttonVariants } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Customer } from '@/types'

export default function CustomerMenu({ customer }: { customer: Customer }) {
    const router = useRouter()
    const pathname = usePathname()
    const baseHref = `/app/customers/${customer.id}`
    const menus = [
        {
            id: 'blogs',
            label: 'Bloglar',
            icon: IoNewspaper,
            count: customer._count?.posts ?? 0,
            items: [
                { href: `${baseHref}/blogs/add`, label: 'Yeni Blog Ekle', icon: IoAdd },
                { href: `${baseHref}/blogs`, label: 'Bloglar', icon: IoList },
            ],
        },
        {
            id: 'notes',
            label: 'Notlar',
            icon: IoDocumentText,
            count: customer._count?.notes ?? 0,
            items: [
                { href: `${baseHref}/notes/add`, label: 'Yeni Not Ekle', icon: IoAdd },
                { href: `${baseHref}/notes`, label: 'Notlar', icon: IoList },
            ],
        },
    ]

    return (
        <nav className='flex flex-row gap-2'>
            {menus.map((menu) => (
                <DropdownMenu key={menu.id}>
                    <DropdownMenuTrigger
                        className={buttonVariants({
                            variant: pathname.startsWith(`${baseHref}/${menu.id}`) ? 'default' : 'outline',
                        })}
                    >
                        <menu.icon /> {menu.label}
                        <span className='text-xs opacity-70'>{menu.count}</span>
                        <IoChevronDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-48'>
                        <DropdownMenuGroup>
                            {menu.items.map((item) => (
                                <DropdownMenuItem key={item.href} onClick={function () { router.push(item.href) }}>
                                    <item.icon /> {item.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            ))}
        </nav>
    )
}
