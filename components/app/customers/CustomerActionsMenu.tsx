'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IoChevronDown, IoCreate, IoTrash } from 'react-icons/io5'
import { toast } from 'sonner'
import { deleteCustomer } from '@/actions/customer'
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
import type { Customer } from '@/types'

export default function CustomerActionsMenu({ customer }: { customer: Customer }) {
    const router = useRouter()
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: 'outline' })}>
                    <IoCreate /> Düzenle
                    <IoChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-48'>
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={handleEdit}>
                            <IoCreate /> Bilgileri Düzenle
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem variant='destructive' onClick={handleDeleteClick}>
                            <IoTrash /> Sil
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Rendered outside the dropdown so it stays open after the menu closes */}
            <AlertDialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {customer.fullName} adlı müşteri, notları ve blogları ile birlikte silinecek.
                        </AlertDialogDescription>
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
        router.push(`/app/customers/${customer.id}/edit`)
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
        const result = await deleteCustomer({ customerId: customer.id })

        if (!result.status) {
            setIsDeleting(false)
            toast.error(result.message ?? 'Müşteri silinemedi')
            return
        }

        toast.success(result.message ?? 'Müşteri silindi')
        router.replace(result.href ?? '/app/customers')
    }
}
