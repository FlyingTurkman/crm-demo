'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IoChevronDown, IoCreate, IoTrash } from 'react-icons/io5'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { useSiteContext } from '@/components/app/context/SiteContext'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import type { Response } from '@/types'

type DeleteResult = Response & {
    href?: string
}

// "Düzenle" dropdown with an edit link and a delete item that asks for confirmation
export default function EditDeleteMenu({
    editLabel,
    editHref,
    deleteDescription,
    deletePermission,
    canDelete: canDeleteItem = true,
    onDelete,
    size = 'default'
}: {
    editLabel: string
    editHref: string
    deleteDescription: string
    // Users without it don't see the delete item (the action checks it again)
    deletePermission: Permission
    // Extra per-item rule, e.g. an admin can't delete their own account
    canDelete?: boolean
    onDelete: () => Promise<DeleteResult>
    size?: 'default' | 'sm'
}) {
    const router = useRouter()
    const { user } = useSiteContext()
    const canDelete = canDeleteItem && hasPermission(user?.role, deletePermission)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: 'outline', size })}>
                    <IoCreate /> Düzenle
                    <IoChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-48'>
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={handleEdit}>
                            <IoCreate /> {editLabel}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem variant='destructive' onClick={handleDeleteClick}>
                                    <IoTrash /> Sil
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Rendered outside the dropdown so it stays open after the menu closes */}
            <AlertDialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction variant='destructive' disabled={isDeleting} onClick={handleDelete}>
                            {isDeleting && <Spinner />}
                            {isDeleting ? 'Siliniyor...' : 'Evet, sil'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )

    function handleEdit() {
        router.push(editHref)
    }

    function handleDeleteClick() {
        setIsDeleteOpen(true)
    }

    function handleDeleteOpenChange(nextOpen: boolean) {
        // Keep the dialog open while the delete request is running
        if (isDeleting) {
            return
        }
        setIsDeleteOpen(nextOpen)
    }

    async function handleDelete() {
        setIsDeleting(true)
        const result = await onDelete()

        if (!result.status) {
            setIsDeleting(false)
            toast.error(result.message ?? 'Silinemedi')
            return
        }

        toast.success(result.message ?? 'Silindi')
        setIsDeleting(false)
        setIsDeleteOpen(false)
        if (result.href) {
            router.replace(result.href)
        }
        router.refresh()
    }
}
