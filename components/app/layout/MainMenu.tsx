'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    IoChevronDown,
    IoDocumentText,
    IoHome,
    IoLogOut,
    IoMenu,
    IoNewspaper,
    IoPeople,
    IoPerson,
    IoShieldCheckmark,
} from 'react-icons/io5'
import { logout } from '@/actions/auth'
import { useSiteContext } from '@/components/app/context/SiteContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { userRoleLabels } from '@/lib/src/constants'
import { cn } from '@/lib/utils'

// Items with a permission are only shown to users that have it (pages check it again)
const menuItems: { href: string, label: string, icon: typeof IoHome, permission?: Permission }[] = [
    { href: '/app', label: 'Ana Sayfa', icon: IoHome },
    { href: '/app/customers', label: 'Müşteriler', icon: IoPeople },
    { href: '/app/notes', label: 'Notlar', icon: IoDocumentText },
    { href: '/app/blogs', label: 'Bloglar', icon: IoNewspaper },
    { href: '/app/admin', label: 'Admin Paneli', icon: IoShieldCheckmark, permission: 'user:read' },
]

// Desktop (md+): links in a row + profile dropdown.
// Mobile: links in a Sheet from the left, profile in a Sheet from the right.
export default function MainMenu() {
    const router = useRouter()
    const pathname = usePathname()
    const { user, setUser } = useSiteContext()
    const [isNavOpen, setIsNavOpen] = useState(false)
    const [isUserOpen, setIsUserOpen] = useState(false)
    const visibleMenuItems = menuItems.filter(function (item) {
        return !item.permission || hasPermission(user?.role, item.permission)
    })
    const initials = user ? `${user.name.charAt(0)}${user.surname.charAt(0)}`.toLocaleUpperCase('tr-TR') : ''

    return (
        <div className='sticky top-0 z-20 h-14 bg-primary text-primary-foreground'>
            <div className='container mx-auto flex h-full flex-row items-center gap-2 p-2 md:gap-4'>
                {/* Mobile: navigation sheet from the left */}
                <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
                    {/* Fixed ids: Base UI's generated ids could differ between server and client (hydration mismatch) */}
                    <SheetTrigger
                        id='main-menu-nav-trigger'
                        className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'md:hidden' })}
                        aria-label='Menüyü aç'
                    >
                        <IoMenu className='size-5' />
                    </SheetTrigger>
                    <SheetContent side='left' className='w-72'>
                        <SheetHeader>
                            <SheetTitle>CRM</SheetTitle>
                            <SheetDescription className='sr-only'>Sayfalar arasında gezinin</SheetDescription>
                        </SheetHeader>
                        <nav className='flex flex-col gap-1 px-4'>
                            {visibleMenuItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeNav}
                                    className={buttonVariants({
                                        variant: isActive(item.href) ? 'secondary' : 'ghost',
                                        className: 'justify-start',
                                    })}
                                >
                                    <item.icon /> {item.label}
                                </Link>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Mobile: the app name leads to the dashboard */}
                <Link href='/app' className='font-semibold md:hidden'>CRM</Link>

                {/* Desktop: links in a row */}
                <nav className='hidden flex-row items-center gap-1 md:flex lg:gap-2'>
                    {visibleMenuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={buttonVariants({
                                variant: 'ghost',
                                className: cn('items-center justify-center', isActive(item.href) && 'bg-primary-foreground/15'),
                            })}
                        >
                            <item.icon /> {item.label}
                        </Link>
                    ))}
                </nav>

                {user && (
                    <>
                        {/* Desktop: profile dropdown (wrapper div, the trigger's own classes would override 'hidden') */}
                        <div className='ml-auto hidden md:block'>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    id='main-menu-profile-trigger'
                                    className={buttonVariants({ variant: 'ghost', className: 'h-auto gap-2 py-1' })}
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
                                                <span className='text-xs text-muted-foreground'>{userRoleLabels[user.role]}</span>
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
                        </div>

                        {/* Mobile: profile sheet from the right */}
                        <Sheet open={isUserOpen} onOpenChange={setIsUserOpen}>
                            <SheetTrigger
                                id='main-menu-user-trigger'
                                className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'ml-auto md:hidden' })}
                                aria-label='Profil menüsünü aç'
                            >
                                <Avatar size='sm'>
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                            </SheetTrigger>
                            <SheetContent side='right' className='w-72'>
                                <SheetHeader>
                                    <div className='flex items-center gap-3'>
                                        <Avatar size='lg'>
                                            <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className='grid min-w-0'>
                                            <SheetTitle className='truncate'>{user.fullName}</SheetTitle>
                                            <SheetDescription className='truncate'>{user.email}</SheetDescription>
                                            <span className='text-xs text-muted-foreground'>{userRoleLabels[user.role]}</span>
                                        </div>
                                    </div>
                                </SheetHeader>
                                <Separator />
                                <div className='flex flex-col gap-1 px-4'>
                                    <Button variant='ghost' className='justify-start' onClick={handleProfile}>
                                        <IoPerson /> Profilim
                                    </Button>
                                    <Button variant='ghost' className='justify-start text-destructive' onClick={handleLogout}>
                                        <IoLogOut /> Çıkış Yap
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </>
                )}
            </div>
        </div>
    )

    // '/app' is only active on the dashboard itself, other items also on their sub pages
    function isActive(href: string) {
        return href === '/app' ? pathname === '/app' : pathname.startsWith(href)
    }

    function closeNav() {
        setIsNavOpen(false)
    }

    function handleProfile() {
        setIsUserOpen(false)
        router.push('/app/profile')
    }

    async function handleLogout() {
        setIsUserOpen(false)
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
