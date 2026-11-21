'use client'

import type { TransitionStartFunction } from 'react'
import { usePathname } from 'next/navigation'
import { useSearchQuery } from 'use-search-query'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

// Page numbers to show: first, last and the neighbours of the current page, null = ellipsis
function getPageItems(page: number, pageCount: number) {
    const items: (number | null)[] = []

    for (let item = 1; item <= pageCount; item++) {
        const isEdge = item === 1 || item === pageCount
        const isNear = Math.abs(item - page) <= 1

        if (isEdge || isNear) {
            items.push(item)
        } else if (items[items.length - 1] !== null) {
            items.push(null)
        }
    }

    return items
}

// Paginates any list whose page lives in the ?page search param (use-search-query)
export default function ListPagination({
    page,
    pageCount,
    startTransition
}: {
    page: number
    pageCount: number
    startTransition: TransitionStartFunction
}) {
    const pathname = usePathname()
    const { setSearchParams, routeToSearchParams } = useSearchQuery()
    const pageItems = getPageItems(page, pageCount).map((item, index) => ({
        id: item === null ? `ellipsis-${index}` : `page-${item}`,
        page: item,
    }))
    const hasPrevious = page > 1
    const hasNext = page < pageCount

    if (pageCount <= 1) {
        return null
    }

    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        text='Önceki'
                        href={getPageHref(page - 1)}
                        aria-disabled={!hasPrevious}
                        className={cn(!hasPrevious && 'pointer-events-none opacity-50')}
                        onClick={function (e) {
                            handlePageClick(e, page - 1)
                        }}
                    />
                </PaginationItem>
                {pageItems.map((item) => (
                    <PaginationItem key={item.id}>
                        {item.page === null ? (
                            <PaginationEllipsis />
                        ) : (
                            <PaginationLink
                                href={getPageHref(item.page)}
                                isActive={item.page === page}
                                onClick={function (e) {
                                    handlePageClick(e, item.page as number)
                                }}
                            >
                                {item.page}
                            </PaginationLink>
                        )}
                    </PaginationItem>
                ))}
                <PaginationItem>
                    <PaginationNext
                        text='Sonraki'
                        href={getPageHref(page + 1)}
                        aria-disabled={!hasNext}
                        className={cn(!hasNext && 'pointer-events-none opacity-50')}
                        onClick={function (e) {
                            handlePageClick(e, page + 1)
                        }}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )

    // Real href (keeps the other filters) so the link also works in a new tab
    function getPageHref(target: number) {
        const queryString = setSearchParams({ page: target === 1 ? undefined : target })
        return queryString ? `${pathname}?${queryString}` : pathname
    }

    function handlePageClick(e: React.MouseEvent<HTMLAnchorElement>, target: number) {
        // Let ctrl / cmd / middle click open the page in a new tab
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
            return
        }
        e.preventDefault()
        if (target < 1 || target > pageCount || target === page) {
            return
        }
        startTransition(function () {
            routeToSearchParams(pathname, { page: target === 1 ? undefined : target }, { scroll: true })
        })
    }
}
