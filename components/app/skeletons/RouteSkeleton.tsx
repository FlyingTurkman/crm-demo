'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AgendaSkeleton from '@/components/app/skeletons/AgendaSkeleton'
import CustomerHeaderSkeleton from '@/components/app/skeletons/CustomerHeaderSkeleton'
import CustomerOverviewSkeleton from '@/components/app/skeletons/CustomerOverviewSkeleton'
import DashboardSkeleton from '@/components/app/skeletons/DashboardSkeleton'
import FormSkeleton from '@/components/app/skeletons/FormSkeleton'
import ListSkeleton from '@/components/app/skeletons/ListSkeleton'
import PostViewSkeleton from '@/components/app/skeletons/PostViewSkeleton'
import ProfileSkeleton from '@/components/app/skeletons/ProfileSkeleton'
import SectionShellSkeleton from '@/components/app/skeletons/SectionShellSkeleton'
import { objectIdPattern } from '@/lib/src/constants'

// Which layouts are already on the screen above the loading.tsx that renders this:
// - 'app':     only the main menu (app/app/loading.tsx) → also draws the section sidebar and customer header
// - 'section': the section layout with its sidebar      → also draws the customer header
// - 'content': every layout                             → only the page itself
export type SkeletonScope = 'app' | 'section' | 'content'

const sections = ['customers', 'blogs', 'notes', 'admin']

// Skeleton of the page being opened, chosen from the URL. Used by every loading.tsx under /app,
// so a navigation shows the shape of the target page at once, whichever layout is still loading.
export default function RouteSkeleton({ scope }: { scope: SkeletonScope }) {
    const pathname = usePathname()
    // '/app/customers/<id>/blogs' -> ['customers', '<id>', 'blogs']
    const segments = pathname.split('/').filter(Boolean).slice(1)
    const section = segments[0]
    const isCustomerDetail = section === 'customers' && isId(segments[1])

    let content = getPageSkeleton(segments)
    if (isCustomerDetail && scope !== 'content') {
        content = <CustomerHeaderSkeleton>{content}</CustomerHeaderSkeleton>
    }
    if (scope === 'app' && sections.includes(section)) {
        content = <SectionShellSkeleton>{content}</SectionShellSkeleton>
    }

    return (
        <div role='status' aria-label='Yükleniyor' aria-busy>
            {content}
        </div>
    )
}

function isId(value: string | undefined) {
    return Boolean(value && objectIdPattern.test(value))
}

function getPageSkeleton(segments: string[]): ReactNode {
    const [section, first, second, third, fourth] = segments

    if (!section) {
        return <DashboardSkeleton />
    }
    if (section === 'profile') {
        return <ProfileSkeleton />
    }
    if (section === 'agenda') {
        return <AgendaSkeleton />
    }

    // /app/customers/<customerId>/** render inside the customer layout (it has its own padding)
    if (section === 'customers' && isId(first)) {
        if (!second) {
            return <CustomerOverviewSkeleton />
        }
        if (second === 'edit') {
            return <FormSkeleton />
        }
        if (second === 'blogs' || second === 'notes') {
            if (!third) {
                return <ListSkeleton variant='cards' withTitle={false} />
            }
            // blogs/<postId> is the view page, every other child is a rich text form
            if (second === 'blogs' && isId(third) && !fourth) {
                return <PostViewSkeleton />
            }
            return <FormSkeleton editor />
        }
    }

    // Section pages: list, add, edit (<id>/edit). Blogs and notes are added with the rich text editor.
    if ((section === 'blogs' || section === 'notes') && first === 'add') {
        return <FormSkeleton editor className='p-4' />
    }
    if (first) {
        return <FormSkeleton className='p-4' />
    }
    return <ListSkeleton className='p-4' />
}
