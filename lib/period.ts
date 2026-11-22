import { createdPeriods } from '@/lib/src/constants'

export type CreatedPeriod = (typeof createdPeriods)[number]

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
