import type { PostStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { postStatusLabels } from '@/lib/src/constants'

const statusVariants: Record<PostStatus, 'outline' | 'secondary' | 'default'> = {
    draft: 'outline',
    inReview: 'secondary',
    published: 'default',
}

export default function PostStatusBadge({ status }: { status: PostStatus }) {
    return (
        <Badge variant={statusVariants[status]}>{postStatusLabels[status]}</Badge>
    )
}
