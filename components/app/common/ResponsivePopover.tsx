'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsMobile } from '@/hooks/use-mobile'

// Floating panel on desktop (Popover), bottom sheet on mobile (Drawer): there the panel slides up
// from the bottom of the screen and sits above the on-screen keyboard.
// Search bars, the customer picker and the dashboard's date picker all open through this.
export default function ResponsivePopover({
    open,
    onOpenChange,
    title,
    trigger,
    triggerId,
    triggerLabel,
    triggerClassName,
    isInvalid,
    modal = false,
    align = 'start',
    contentClassName,
    children,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    // Heading of the mobile drawer (also its accessible name)
    title: string
    // Content of the trigger button
    trigger: ReactNode
    triggerId?: string
    // aria-label of the trigger
    triggerLabel?: string
    triggerClassName?: string
    isInvalid?: boolean
    // Desktop only: blocks the page behind the popover (the drawer always does)
    modal?: boolean
    align?: 'start' | 'center' | 'end'
    // Desktop popover
    contentClassName?: string
    children: ReactNode
}) {
    const isMobile = useIsMobile()
    const panelRef = useRef<HTMLDivElement>(null)
    const keyboardStyle = useKeyboardOffset(isMobile && open)

    // Focus the search input as soon as the drawer opens, so typing starts at once
    useEffect(function () {
        if (!isMobile || !open) {
            return
        }
        const frame = requestAnimationFrame(function () {
            panelRef.current?.querySelector('input')?.focus()
        })
        return function () {
            cancelAnimationFrame(frame)
        }
    }, [isMobile, open])

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={handleOpenChange}>
                <DrawerTrigger
                    id={triggerId}
                    aria-label={triggerLabel}
                    aria-invalid={isInvalid}
                    className={triggerClassName}
                >
                    {trigger}
                </DrawerTrigger>
                <DrawerContent style={keyboardStyle}>
                    <DrawerHeader className='text-left'>
                        <DrawerTitle>{title}</DrawerTitle>
                    </DrawerHeader>
                    <div ref={panelRef} className='flex min-h-0 flex-1 flex-col p-4'>
                        {children}
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Popover modal={modal} open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
                id={triggerId}
                aria-label={triggerLabel}
                aria-invalid={isInvalid}
                className={triggerClassName}
            >
                {trigger}
            </PopoverTrigger>
            <PopoverContent align={align} className={contentClassName}>
                {children}
            </PopoverContent>
        </Popover>
    )

    function handleOpenChange(value: boolean) {
        onOpenChange(value)
    }
}

// iOS Safari (and Chrome on Android by default) open the keyboard over the page without
// shrinking it, so a sheet fixed to the bottom would end up behind the keyboard. While the
// drawer is open, lift it by the keyboard's height and keep it inside the visible area.
function useKeyboardOffset(isActive: boolean): CSSProperties | undefined {
    const [offset, setOffset] = useState({ bottom: 0, height: 0 })

    useEffect(function () {
        const viewport = window.visualViewport
        if (!isActive || !viewport) {
            return
        }
        const visualViewport = viewport

        function update() {
            const bottom = Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
            setOffset({ bottom, height: visualViewport.height })
        }

        update()
        visualViewport.addEventListener('resize', update)
        visualViewport.addEventListener('scroll', update)
        return function () {
            visualViewport.removeEventListener('resize', update)
            visualViewport.removeEventListener('scroll', update)
        }
    }, [isActive])

    if (!isActive || offset.bottom === 0) {
        return undefined
    }
    return {
        bottom: offset.bottom,
        maxHeight: offset.height - 16,
    }
}
