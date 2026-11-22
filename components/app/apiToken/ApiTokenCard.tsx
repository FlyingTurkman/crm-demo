'use client'

import { useState } from 'react'
import { IoKey, IoRefresh } from 'react-icons/io5'
import { toast } from 'sonner'
import type { ApiTokenInfo } from '@/actions/apiToken'
import ApiTokenDialog from '@/components/app/apiToken/ApiTokenDialog'
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
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiBasePath } from '@/lib/src/constants'

type RegenerateResult = {
    status: boolean
    message?: string
    token?: string
    apiToken?: ApiTokenInfo
}

// REST API token of a user (admin panel edit page, profile page): when it was created / last used,
// and a button that replaces it (the new token is shown once).
// `onRegenerate` calls the page's Server Action; `lockedReason` disables the button and says why.
export default function ApiTokenCard({
    apiToken,
    onRegenerate,
    lockedReason,
    className
}: {
    apiToken: ApiTokenInfo | null
    onRegenerate: () => Promise<RegenerateResult>
    lockedReason?: string
    className?: string
}) {
    const [info, setInfo] = useState(apiToken)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [newToken, setNewToken] = useState<string | null>(null)

    return (
        <Card className={cn('w-full max-w-2xl', className)}>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <IoKey aria-hidden /> API Token
                </CardTitle>
                <CardDescription>
                    REST API ({apiBasePath}) isteklerinde <code className='font-mono'>Authorization: Bearer &lt;token&gt;</code> başlığıyla kullanılır.
                    Token yalnızca SHA-256 hash olarak saklanır, bu yüzden sadece oluşturulduğu anda görülebilir.
                </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
                <dl className='grid gap-1 text-sm sm:grid-cols-2'>
                    <div>
                        <dt className='text-muted-foreground'>Oluşturulma</dt>
                        <dd>{info ? formatDateTime(info.createdAt) : 'Token yok'}</dd>
                    </div>
                    <div>
                        <dt className='text-muted-foreground'>Son kullanım</dt>
                        <dd>{info?.lastUsedAt ? formatDateTime(info.lastUsedAt) : 'Hiç kullanılmadı'}</dd>
                    </div>
                </dl>
                <Button
                    variant='outline'
                    className='w-fit'
                    disabled={isGenerating || Boolean(lockedReason)}
                    onClick={handleOpenConfirm}
                >
                    {isGenerating ? <Spinner /> : <IoRefresh />}
                    {isGenerating ? 'Oluşturuluyor...' : info ? 'Yeni Token Oluştur' : 'Token Oluştur'}
                </Button>
                {lockedReason && (
                    <p className='text-sm text-muted-foreground'>{lockedReason}</p>
                )}
            </CardContent>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Yeni API token oluşturulsun mu?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Mevcut token hemen geçersiz olur ve onu kullanan entegrasyonlar çalışmayı durdurur.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGenerate}>Evet, oluştur</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ApiTokenDialog token={newToken} onClose={handleCloseToken} />
        </Card>
    )

    function handleOpenConfirm() {
        // Nothing to invalidate yet: generate right away
        if (!info) {
            handleGenerate()
            return
        }
        setIsConfirmOpen(true)
    }

    async function handleGenerate() {
        setIsConfirmOpen(false)
        setIsGenerating(true)
        const result = await onRegenerate()
        setIsGenerating(false)

        if (!result.status || !result.token) {
            toast.error(result.message ?? 'Token oluşturulamadı')
            return
        }
        toast.success(result.message ?? 'Token oluşturuldu')
        setInfo(result.apiToken ?? null)
        setNewToken(result.token)
    }

    function handleCloseToken() {
        setNewToken(null)
    }
}
