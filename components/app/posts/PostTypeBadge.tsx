import type { PostType } from '@prisma/client'
import { IoBrowsers, IoChatbubbles, IoDocumentText, IoMail, IoShapes } from 'react-icons/io5'
import { Badge } from '@/components/ui/badge'
import { postTypeLabels } from '@/lib/src/constants'

const typeIcons: Record<PostType, typeof IoShapes> = {
    socialMedia: IoChatbubbles,
    blog: IoDocumentText,
    webPage: IoBrowsers,
    newsletter: IoMail,
    other: IoShapes,
}

export default function PostTypeBadge({ type }: { type: PostType }) {
    const Icon = typeIcons[type]

    return (
        <Badge variant='outline'>
            <Icon aria-hidden /> {postTypeLabels[type]}
        </Badge>
    )
}
