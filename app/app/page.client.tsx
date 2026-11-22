'use client'

import { useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { IoCheckmarkCircle, IoDocumentText, IoNewspaper, IoPeople } from 'react-icons/io5'
import { useSearchQuery } from 'use-search-query'
import type { DashboardStats } from '@/actions/dashboard'
import DashboardDatePicker from '@/components/app/dashboard/DashboardDatePicker'
import PostStatusDonut from '@/components/app/dashboard/PostStatusDonut'
import RecentList from '@/components/app/dashboard/RecentList'
import StatTile from '@/components/app/dashboard/StatTile'
import TopCustomersList from '@/components/app/dashboard/TopCustomersList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, getNotePreview } from '@/lib/format'
import { getStartOfToday, parseDateParam, toDateParam, type CreatedPeriod } from '@/lib/period'
import { createdPeriodLabels, createdPeriods, postStatusLabels } from '@/lib/src/constants'
import { cn } from '@/lib/utils'

export default function AppPageClient({
    stats,
    period,
    date,
    errorMessage
}: {
    stats?: DashboardStats
    period: CreatedPeriod
    // Selected day (YYYY-MM-DD), everything below is calculated for it
    date: string
    errorMessage?: string
}) {
    const pathname = usePathname()
    const { routeToSearchParams } = useSearchQuery()
    // Shared by the date picker and the range select: dims the stats while they reload
    const [isPending, startTransition] = useTransition()
    const isToday = date === toDateParam(getStartOfToday())
    const dayLabel = formatDate(parseDateParam(date))
    const shortDayLabel = parseDateParam(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    const periodLabels: Record<CreatedPeriod, string> = {
        today: isToday ? 'Bugün' : 'Seçili gün',
        week: createdPeriodLabels.week,
        month: createdPeriodLabels.month,
    }
    const periodTitles: Record<CreatedPeriod, string> = isToday
        ? { today: 'Bugün eklenenler', week: 'Son 7 günde eklenenler', month: 'Son 30 günde eklenenler' }
        : {
            today: `${dayLabel} tarihinde eklenenler`,
            week: `${dayLabel} ile biten 7 günde eklenenler`,
            month: `${dayLabel} ile biten 30 günde eklenenler`,
        }
    const emptyText = period === 'today' ? `${isToday ? 'Bugün' : 'Bu gün'} eklenen yok` : 'Bu aralıkta eklenen yok'

    if (!stats) {
        return (
            <p className='p-4 text-sm text-destructive'>{errorMessage ?? 'İstatistikler yüklenemedi'}</p>
        )
    }

    // The lists' ?period= filter counts back from now, so quick filter links only fit today's view
    const dayNoteLabel = isToday ? 'Bugün' : shortDayLabel
    const publishedShare = stats.posts.total === 0
        ? 0
        : Math.round((stats.posts.byStatus.published / stats.posts.total) * 100)
    const tiles = [
        {
            id: 'customers',
            label: 'Toplam müşteri',
            value: stats.customers.total,
            href: '/app/customers',
            icon: IoPeople,
            note: `${dayNoteLabel} +${stats.customers.onDay}`,
            noteHref: isToday ? '/app/customers?period=today' : undefined,
        },
        {
            id: 'posts',
            label: 'Toplam blog',
            value: stats.posts.total,
            href: '/app/blogs',
            icon: IoNewspaper,
            note: `${dayNoteLabel} +${stats.posts.onDay}`,
            noteHref: isToday ? '/app/blogs?period=today' : undefined,
        },
        {
            id: 'notes',
            label: 'Toplam not',
            value: stats.notes.total,
            href: '/app/notes',
            icon: IoDocumentText,
            note: `${dayNoteLabel} +${stats.notes.onDay}`,
            noteHref: isToday ? '/app/notes?period=today' : undefined,
        },
        {
            id: 'published',
            label: 'Yayındaki blog',
            value: stats.posts.byStatus.published,
            href: '/app/blogs?status=published',
            icon: IoCheckmarkCircle,
            note: `Blogların %${publishedShare} kadarı · ${postStatusLabels.inReview}: ${stats.posts.byStatus.inReview}`,
            noteHref: '/app/blogs?status=inReview',
        },
    ]

    return (
        <div className='container mx-auto flex flex-col gap-6 p-4'>
            <div className='flex flex-col gap-2'>
                <h1 className='text-2xl font-semibold'>Genel Bakış</h1>
                <DashboardDatePicker date={date} isPending={isPending} startTransition={startTransition} />
                {!isToday && (
                    <p className='text-sm text-muted-foreground'>
                        Sayılar {dayLabel} gününün sonundaki duruma göre. Blog durumları güncel durumu gösterir.
                    </p>
                )}
            </div>

            <div className={cn('flex flex-col gap-6 transition-opacity', isPending && 'opacity-60')}>
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                    {tiles.map((tile) => (
                        <StatTile
                            key={tile.id}
                            label={tile.label}
                            value={tile.value}
                            href={tile.href}
                            icon={tile.icon}
                            note={tile.note}
                            noteHref={tile.noteHref}
                        />
                    ))}
                </div>

                <div className='grid gap-4 lg:grid-cols-2'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Blog durumları</CardTitle>
                            <CardDescription>Bir dilime ya da satıra tıklayarak blogları o duruma göre filtreleyin</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PostStatusDonut byStatus={stats.posts.byStatus} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>En çok blogu olan müşteriler</CardTitle>
                            <CardDescription>Müşterinin bloglarını açmak için tıklayın</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TopCustomersList items={stats.topCustomers} />
                        </CardContent>
                    </Card>
                </div>

                <div className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                        <h2 className='text-lg font-semibold'>{periodTitles[period]}</h2>
                        <Select items={periodLabels} value={period} onValueChange={handlePeriodChange}>
                            <SelectTrigger className='w-40' aria-label='Tarih aralığı'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {createdPeriods.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {periodLabels[item]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='grid gap-4 lg:grid-cols-3'>
                        <RecentList
                            title='Müşteriler'
                            icon={IoPeople}
                            count={stats.customers.inPeriod}
                            allHref={isToday ? `/app/customers?period=${period}` : undefined}
                            emptyText={emptyText}
                            showDate={period !== 'today' || !isToday}
                            items={stats.recentCustomers.map((customer) => ({
                                id: customer.id,
                                title: customer.fullName,
                                subtitle: customer.company ?? customer.email,
                                href: `/app/customers/${customer.id}`,
                                createdAt: customer.createdAt,
                            }))}
                        />
                        <RecentList
                            title='Bloglar'
                            icon={IoNewspaper}
                            count={stats.posts.inPeriod}
                            allHref={isToday ? `/app/blogs?period=${period}` : undefined}
                            emptyText={emptyText}
                            showDate={period !== 'today' || !isToday}
                            items={stats.recentPosts.map((post) => ({
                                id: post.id,
                                title: post.title,
                                subtitle: `${post.customer?.fullName ?? ''} · ${postStatusLabels[post.status]}`,
                                href: `/app/customers/${post.customerId}/blogs/${post.id}`,
                                createdAt: post.createdAt,
                            }))}
                        />
                        <RecentList
                            title='Notlar'
                            icon={IoDocumentText}
                            count={stats.notes.inPeriod}
                            allHref={isToday ? `/app/notes?period=${period}` : undefined}
                            emptyText={emptyText}
                            showDate={period !== 'today' || !isToday}
                            items={stats.recentNotes.map((note) => ({
                                id: note.id,
                                title: getNotePreview(note.content),
                                subtitle: note.customer?.fullName,
                                href: `/app/customers/${note.customerId}/notes/${note.id}/edit`,
                                createdAt: note.createdAt,
                            }))}
                        />
                    </div>
                </div>
            </div>
        </div>
    )

    function handlePeriodChange(value: CreatedPeriod | null) {
        startTransition(function () {
            // Today is the default and is left out of the URL
            routeToSearchParams(pathname, { period: !value || value === 'today' ? undefined : value })
        })
    }
}
