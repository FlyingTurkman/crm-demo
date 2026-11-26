import type { PostPlatform } from '@prisma/client'
import PostPlatformIcon from '@/components/app/posts/PostPlatformIcon'
import { Badge } from '@/components/ui/badge'
import { postPlatformLabels } from '@/lib/src/constants'
import { cn } from '@/lib/utils'

// Channels of a post. `compact` shows only the icons (tables, dashboard lists), names stay in the tooltip.
export default function PostPlatformBadges({
    platforms,
    compact = false,
    emptyText,
    className
}: {
    platforms: PostPlatform[]
    compact?: boolean
    // Shown when no channel is picked (nothing by default)
    emptyText?: string
    className?: string
}) {
    if (platforms.length === 0) {
        return emptyText ? <span className='text-sm text-muted-foreground'>{emptyText}</span> : null
    }

    if (compact) {
        const names = platforms.map((platform) => postPlatformLabels[platform]).join(', ')
        return (
            <span className={cn('inline-flex items-center gap-1.5 text-muted-foreground', className)} title={names}>
                {platforms.map((platform) => (
                    <PostPlatformIcon key={platform} platform={platform} className='size-4' />
                ))}
                <span className='sr-only'>{names}</span>
            </span>
        )
    }

    return (
        <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
            {platforms.map((platform) => (
                <Badge key={platform} variant='outline'>
                    <PostPlatformIcon platform={platform} /> {postPlatformLabels[platform]}
                </Badge>
            ))}
        </span>
    )
}
