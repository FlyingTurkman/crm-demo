import type { UserRole } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { userRoleLabels } from '@/lib/src/constants'

export default function UserRoleBadge({ role }: { role: UserRole }) {
    return (
        <Badge variant={role === 'admin' ? 'default' : 'secondary'}>{userRoleLabels[role]}</Badge>
    )
}
