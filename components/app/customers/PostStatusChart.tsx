'use client'

import Link from 'next/link'
import type { PostStatus } from '@prisma/client'
import { IoAdd } from 'react-icons/io5'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { buttonVariants } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { postStatusLabels } from '@/lib/src/constants'

const postStatuses: PostStatus[] = ['draft', 'inReview', 'published']

const chartConfig = {
    count: {
        label: 'İçerik',
        // Neutral theme's --chart-1 is a light gray; primary keeps the bars readable in light and dark mode
        color: 'var(--primary)',
    },
} satisfies ChartConfig

export default function PostStatusChart({
    customerId,
    postStatusCounts
}: {
    customerId: string
    postStatusCounts: Record<PostStatus, number>
}) {
    const chartData = postStatuses.map((status) => ({
        status: postStatusLabels[status],
        count: postStatusCounts[status],
    }))
    const total = chartData.reduce(function (sum, item) {
        return sum + item.count
    }, 0)

    if (total === 0) {
        return (
            <div className='flex flex-col items-center gap-3 py-8'>
                <p className='text-sm text-muted-foreground'>Bu müşterinin henüz içeriği yok</p>
                <Link href={`/app/customers/${customerId}/blogs/add`} className={buttonVariants({ variant: 'link' })}>
                    <IoAdd /> Yeni İçerik Ekle
                </Link>
            </div>
        )
    }

    return (
        <ChartContainer config={chartConfig} className='aspect-auto h-56 w-full'>
            <BarChart accessibilityLayer data={chartData} margin={{ top: 24 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey='status' tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel={false} />} />
                <Bar dataKey='count' fill='var(--color-count)' radius={[4, 4, 0, 0]} maxBarSize={56}>
                    <LabelList dataKey='count' position='top' className='fill-foreground' fontSize={12} />
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}
