'use client'

import { IoCopy, IoWarning } from 'react-icons/io5'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// Shows a freshly generated API token. Only its hash is stored, so this is the only time it can be seen.
export default function ApiTokenDialog({
    token,
    onClose
}: {
    token: string | null
    onClose: () => void
}) {
    return (
        <Dialog open={Boolean(token)} onOpenChange={handleOpenChange}>
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>API Token</DialogTitle>
                    <DialogDescription className='flex items-start gap-2'>
                        <IoWarning className='mt-0.5 shrink-0' aria-hidden />
                        Bu token yalnızca şimdi gösterilir. Kopyalayıp güvenli bir yerde saklayın.
                    </DialogDescription>
                </DialogHeader>
                <Input
                    readOnly
                    value={token ?? ''}
                    aria-label='API token'
                    className='font-mono text-xs'
                    onFocus={handleFocus}
                />
                <DialogFooter>
                    <Button variant='outline' onClick={handleCopy}>
                        <IoCopy /> Kopyala
                    </Button>
                    <Button onClick={onClose}>Tamam</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )

    function handleOpenChange(open: boolean) {
        if (!open) {
            onClose()
        }
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        e.target.select()
    }

    async function handleCopy() {
        if (!token) return
        try {
            await navigator.clipboard.writeText(token)
            toast.success('Token kopyalandı')
        } catch {
            toast.error('Token kopyalanamadı, elle seçip kopyalayın')
        }
    }
}
