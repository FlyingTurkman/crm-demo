'use client'

import { useState } from 'react'
import { IoLaptop, IoLogOut } from 'react-icons/io5'
import { toast } from 'sonner'
import { logoutOtherSessions } from '@/actions/profile'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

// Active logins of the user on other devices / browsers, with a button that logs them all out.
// `lockedReason` disables the button (published demo accounts).
export default function SessionsCard({
    otherSessionCount,
    lockedReason,
    onClosed
}: {
    otherSessionCount: number
    lockedReason?: string
    onClosed: () => void
}) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [isClosing, setIsClosing] = useState(false)

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <IoLaptop aria-hidden /> Oturumlar
                </CardTitle>
                <CardDescription>
                    Hesabınızın açık olduğu diğer cihaz ve tarayıcılar.
                </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
                <p className='text-sm'>
                    {otherSessionCount > 0
                        ? `Bu cihaz dışında ${otherSessionCount} açık oturumunuz var.`
                        : 'Sadece bu cihazda oturumunuz açık.'}
                </p>
                <Button
                    variant='outline'
                    className='w-fit'
                    disabled={isClosing || otherSessionCount === 0 || Boolean(lockedReason)}
                    onClick={handleOpenConfirm}
                >
                    {isClosing ? <Spinner /> : <IoLogOut />}
                    {isClosing ? 'Kapatılıyor...' : 'Diğer Oturumları Kapat'}
                </Button>
                {lockedReason && (
                    <p className='text-sm text-muted-foreground'>{lockedReason}</p>
                )}
            </CardContent>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Diğer oturumlar kapatılsın mı?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu cihaz dışındaki bütün cihazlarda hesabınızdan çıkış yapılır. API token&apos;ınız etkilenmez.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogoutOthers}>Evet, kapat</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )

    function handleOpenConfirm() {
        setIsConfirmOpen(true)
    }

    async function handleLogoutOthers() {
        setIsConfirmOpen(false)
        setIsClosing(true)
        const result = await logoutOtherSessions()
        setIsClosing(false)

        if (!result.status) {
            toast.error(result.message ?? 'Oturumlar kapatılamadı')
            return
        }
        toast.success(result.message ?? 'Diğer oturumlar kapatıldı')
        onClosed()
    }
}
