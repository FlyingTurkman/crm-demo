import type { PostStatus } from '@prisma/client'
import { appUtcOffsetMinutes, createdPeriods, postDueFilters, upcomingDueDays } from '@/lib/src/constants'

export type CreatedPeriod = (typeof createdPeriods)[number]
export type PostDueFilter = (typeof postDueFilters)[number]

const dayMs = 24 * 60 * 60 * 1000

// Start of the day in the server's time zone (Türkiye for this app)
export function getStartOfToday() {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return start
}

// Earliest createdAt that still belongs to the period
export function getPeriodStart(period: CreatedPeriod) {
    if (period === 'today') {
        return getStartOfToday()
    }
    const days = period === 'week' ? 7 : 30
    return new Date(Date.now() - days * dayMs)
}

// Prisma `where` part for the ?period= filter of a list
export function getPeriodWhere(period: CreatedPeriod | undefined) {
    return period ? { createdAt: { gte: getPeriodStart(period) } } : {}
}

const dateParamPattern = /^(\d{4})-(\d{2})-(\d{2})$/

// Date as it is written to the URL: 2026-11-22 (server's time zone)
export function toDateParam(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
}

// Start of the day of a YYYY-MM-DD value (past or future), null when it isn't a real date
export function parseDayValue(value: string) {
    const match = dateParamPattern.exec(value)
    if (!match) {
        return null
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return toDateParam(date) === value ? date : null
}

const dateTimePattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/

const offsetMs = appUtcOffsetMinutes * 60 * 1000

// Date-time as a form / API value in Türkiye time: 2026-11-28T14:30. Explicit offset instead of the
// runtime's time zone, so the server (UTC on Vercel) and the browser agree on the same value.
export function toDateTimeValue(date: Date) {
    const local = new Date(date.getTime() + offsetMs)
    const month = String(local.getUTCMonth() + 1).padStart(2, '0')
    const day = String(local.getUTCDate()).padStart(2, '0')
    const hours = String(local.getUTCHours()).padStart(2, '0')
    const minutes = String(local.getUTCMinutes()).padStart(2, '0')
    return `${local.getUTCFullYear()}-${month}-${day}T${hours}:${minutes}`
}

// YYYY-MM-DDTHH:mm (Türkiye time) → Date, null when it isn't a real date and time
export function parseDateTimeValue(value: string) {
    const match = dateTimePattern.exec(value)
    const day = match ? parseDayValue(match[1]) : null
    if (!match || !day) {
        return null
    }
    const hours = Number(match[2])
    const minutes = Number(match[3])
    if (hours > 23 || minutes > 59) {
        return null
    }
    return new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes) - offsetMs)
}

// Start of the day `days` after the given one
export function addDays(date: Date, days: number) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// A post is overdue when its delivery day has passed and it still isn't published
export function isPostOverdue(post: { dueDate: Date | string | null, status: PostStatus }) {
    return Boolean(post.dueDate) && post.status !== 'published' && new Date(post.dueDate as Date) < getStartOfToday()
}

// Prisma `where` part of overdue posts (also used by the dashboard).
// `not: null` is required: Prisma's MongoDB comparisons treat null as lower than any date,
// so `lt` alone would count every post without a delivery day as overdue.
export function getOverdueWhere() {
    return { dueDate: { lt: getStartOfToday(), not: null }, status: { not: 'published' as const } }
}

// Unpublished posts due today or in the next days
export function getUpcomingWhere() {
    const today = getStartOfToday()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + upcomingDueDays)
    return { dueDate: { gte: today, lt: end }, status: { not: 'published' as const } }
}

// Prisma `where` part for the ?due= filter of a list
export function getDueWhere(due: PostDueFilter | undefined) {
    if (due === 'overdue') return getOverdueWhere()
    if (due === 'week') return getUpcomingWhere()
    if (due === 'none') return { dueDate: null }
    return {}
}

export function parseDueFilter(value: string | undefined): PostDueFilter | undefined {
    return postDueFilters.find(function (item) {
        return item === value
    })
}

// Start of the day of a ?date= value. Invalid or future dates fall back to today.
export function parseDateParam(value: string | undefined) {
    const today = getStartOfToday()
    const match = value ? dateParamPattern.exec(value) : null
    if (!match) {
        return today
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    // new Date(2026, 1, 31) silently becomes March 3rd: reject such values
    const isRealDate = toDateParam(date) === value
    if (!isRealDate || date > today) {
        return today
    }
    return date
}

// [start, end) of a range that ends with the given day: the day itself, its last 7 or 30 days
export function getRangeEndingOn(day: Date, period: CreatedPeriod) {
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    const days = period === 'today' ? 1 : period === 'week' ? 7 : 30
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days)
    return { start, end }
}

// Reads ?period= from the URL, unknown values are ignored
export function parsePeriod(value: string | undefined): CreatedPeriod | undefined {
    return createdPeriods.find(function (item) {
        return item === value
    })
}
