'use client'

import { useState } from 'react'
import type { PostStatus } from '@prisma/client'
import { toast } from 'sonner'
import { updatePostStatus } from '@/actions/post'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { postStatusLabels } from '@/lib/src/constants'

const postStatuses: PostStatus[] = ['draft', 'inReview', 'published']

// Changes a post's status right from the list
export default function PostStatusSelect({ postId, status }: { postId: string, status: PostStatus }) {
    const [isSaving, setIsSaving] = useState(false)

    return (
        <Select items={postStatusLabels} value={status} onValueChange={handleChange} disabled={isSaving}>
            <SelectTrigger size='sm' aria-label='İçerik durumu'>
                {isSaving && <Spinner />}
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {postStatuses.map((item) => (
                    <SelectItem key={item} value={item}>
                        {postStatusLabels[item]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    async function handleChange(value: PostStatus | null) {
        if (!value || value === status) {
            return
        }

        setIsSaving(true)
        const result = await updatePostStatus({ postId, status: value })
        setIsSaving(false)

        if (!result.status) {
            toast.error(result.message ?? 'Durum güncellenemedi')
            return
        }
        toast.success(result.message ?? 'Durum güncellendi')
    }
}
