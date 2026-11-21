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

// Reads ?period= from the URL, unknown values are ignored
export function parsePeriod(value: string | undefined): CreatedPeriod | undefined {
    return createdPeriods.find(function (item) {
        return item === value
    })
}
