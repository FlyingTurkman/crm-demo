'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PostStatus } from '@prisma/client'
import { Label, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { postStatusLabels } from '@/lib/src/constants'

const postStatuses: PostStatus[] = ['draft', 'inReview', 'published']

// Colors come from the --status-* tokens in globals.css (light and dark steps)
const chartConfig = {
    count: { label: 'Blog' },
    draft: { label: postStatusLabels.draft, color: 'var(--status-draft)' },
    inReview: { label: postStatusLabels.inReview, color: 'var(--status-in-review)' },
    published: { label: postStatusLabels.published, color: 'var(--status-published)' },
} satisfies ChartConfig

// Blog status split as a donut. Every slice and legend row opens /app/blogs filtered by that status.
export default function PostStatusDonut({ byStatus }: { byStatus: Record<PostStatus, number> }) {
    const router = useRouter()
    const total = postStatuses.reduce(function (sum, status) {
        return sum + byStatus[status]
    }, 0)
    const chartData = postStatuses.map((status) => ({
        status,
        count: byStatus[status],
        fill: `var(--color-${status})`,
    }))

    if (total === 0) {
        return (
            <p className='py-8 text-center text-sm text-muted-foreground'>Henüz blog yok</p>
        )
    }

    return (
        <div className='flex flex-col items-center gap-4 sm:flex-row'>
            <ChartContainer config={chartConfig} className='aspect-square h-48 shrink-0'>
                <PieChart accessibilityLayer>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey='status' hideLabel />} />
                    <Pie
                        data={chartData}
                        dataKey='count'
                        nameKey='status'
                        innerRadius={56}
                        outerRadius={88}
                        // 2px card-colored gap between slices
                        stroke='var(--card)'
                        strokeWidth={2}
                        className='cursor-pointer'
                        onClick={handleSliceClick}
                    >
                        <Label content={renderCenterLabel} />
                    </Pie>
                </PieChart>
            </ChartContainer>

            {/* Legend with the figures: names and amounts never depend on color alone */}
            <ul className='flex w-full flex-col gap-1'>
                {chartData.map((item) => (
                    <li key={item.status}>
                        <Link
                            href={`/app/blogs?status=${item.status}`}
                            className='flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted'
                        >
                            <span className='size-3 shrink-0 rounded-sm' style={{ backgroundColor: item.fill }} aria-hidden />
                            <span className='flex-1'>{postStatusLabels[item.status]}</span>
                            <span className='font-medium tabular-nums'>{item.count}</span>
                            <span className='w-12 text-right text-muted-foreground tabular-nums'>
                                %{Math.round((item.count / total) * 100)}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )

    // Recharts passes the clicked slice with our row under `payload`
    function handleSliceClick(slice: unknown) {
        const status = (slice as { payload?: { status?: PostStatus } }).payload?.status
        if (status) {
            router.push(`/app/blogs?status=${status}`)
        }
    }

    // Total in the middle of the donut (polar viewBox has cx / cy)
    function renderCenterLabel(props: { viewBox?: unknown }) {
        const viewBox = props.viewBox as { cx?: number, cy?: number } | undefined
        if (!viewBox?.cx || !viewBox.cy) {
            return null
        }
        return (
            <text x={viewBox.cx} y={viewBox.cy} textAnchor='middle' dominantBaseline='middle'>
                <tspan x={viewBox.cx} y={viewBox.cy - 6} className='fill-foreground text-2xl font-semibold'>
                    {total}
                </tspan>
                <tspan x={viewBox.cx} y={viewBox.cy + 16} className='fill-muted-foreground text-xs'>
                    blog
                </tspan>
            </text>
        )
    }
}
