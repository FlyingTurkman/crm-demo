'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IoChevronDown, IoDocumentText, IoHome, IoLogOut, IoNewspaper, IoPeople, IoPerson } from 'react-icons/io5'
import { logout } from '@/actions/auth'
import { useSiteContext } from '@/components/app/context/SiteContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserDto } from '@/dtos/userDTO'

const menuItems = [
    { href: '/app', label: 'Ana Sayfa', icon: IoHome },
    { href: '/app/customers', label: 'Müşteriler', icon: IoPeople },
    { href: '/app/notes', label: 'Notlar', icon: IoDocumentText },
    { href: '/app/blogs', label: 'Bloglar', icon: IoNewspaper },
]

const roleLabels: Record<UserDto['role'], string> = {
    admin: 'Admin',
    moderator: 'Moderatör',
}

export default function MainMenu() {
    const router = useRouter()
    const { user, setUser } = useSiteContext()
    const initials = user ? `${user.name.charAt(0)}${user.surname.charAt(0)}`.toLocaleUpperCase('tr-TR') : ''

    return (
        <div className='sticky top-0 z-20 h-14 bg-primary text-primary-foreground'>
            <div className='container mx-auto h-full p-2 flex flex-row items-center gap-4'>
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={buttonVariants({ variant: 'ghost', className: 'justify-center items-center' })}
                    >
                        <item.icon /> {item.label}
                    </Link>
                ))}

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className={buttonVariants({ variant: 'ghost', className: 'ml-auto h-auto py-1 gap-2' })}
                        >
                            <Avatar size='sm'>
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            {user.fullName}
                            <IoChevronDown />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-56'>
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                    <div className='flex flex-col'>
                                        <span className='text-sm font-medium text-foreground'>{user.fullName}</span>
                                        <span className='text-xs text-muted-foreground'>{user.email}</span>
                                        <span className='text-xs text-muted-foreground'>{roleLabels[user.role]}</span>
                                    </div>
                                </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={handleProfile}>
                                    <IoPerson /> Profilim
                                </DropdownMenuItem>
                                <DropdownMenuItem variant='destructive' onClick={handleLogout}>
                                    <IoLogOut /> Çıkış Yap
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    )

    function handleProfile() {
        router.push('/app/profile')
    }

    async function handleLogout() {
        const result = await logout()

        if (!result.status) {
            toast.error(result.message ?? 'Çıkış yapılamadı')
            return
        }

        setUser(null)
        toast.success(result.message ?? 'Çıkış yapıldı')
        router.replace(result.href ?? '/')
    }
}
