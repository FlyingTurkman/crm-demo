'use client'

import { useState } from 'react'
import {
    RTE,
    RTEAlignToggle,
    RTECharacterCount,
    RTEColorSelect,
    RTEContent,
    RTEFontSelect,
    RTEFontSizeSelect,
    RTEFooter,
    RTEFormatToggle,
    RTEHeader,
    RTEListToggle,
    RTEMarkerSelect,
    RTERedo,
    RTESeparator,
    RTEUndo,
    serializeToHtml,
    serializeToPlainText,
    type RTEDocument,
} from '@/components/rte'
import { htmlToDocument } from './htmlToDocument'

export type RichTextValue = {
    // Plain text without styling (serializeToPlainText)
    content: string
    // HTML output (serializeToHtml)
    rawContent: string
}

// Only fonts loaded in app/layout.tsx, the editor's other fonts would silently fall back
const fontOptions = [
    { label: 'Varsayılan', value: 'inherit' },
    { label: 'Geist', value: 'var(--font-geist-sans), sans-serif' },
    { label: 'Geist Mono', value: 'var(--font-geist-mono), monospace' },
]

// Must be rendered on the client only (uses DOMParser), load it with next/dynamic + ssr: false
export default function RichTextEditor({
    defaultRawContent,
    maxLength,
    placeholder,
    onChange
}: {
    defaultRawContent?: string
    maxLength: number
    placeholder?: string
    onChange: (value: RichTextValue) => void
}) {
    const [defaultDocument] = useState(function () {
        return htmlToDocument(defaultRawContent ?? '')
    })

    return (
        <RTE historyLimit={50} maxLength={maxLength} defaultValue={defaultDocument} onValueChange={handleValueChange}>
            <RTEHeader className='flex-wrap'>
                <RTEUndo />
                <RTERedo />
                <RTESeparator />
                <RTEFontSelect options={fontOptions} />
                <RTEFontSizeSelect />
                <RTEColorSelect />
                <RTEMarkerSelect />
                <RTESeparator />
                <RTEFormatToggle isStrikethroughActive />
                <RTESeparator />
                <RTEListToggle />
                <RTESeparator />
                <RTEAlignToggle />
            </RTEHeader>
            <RTEContent placeholder={placeholder} className='min-h-48' />
            <RTEFooter>
                <RTECharacterCount />
            </RTEFooter>
        </RTE>
    )

    function handleValueChange(document: RTEDocument) {
        onChange({
            content: serializeToPlainText(document),
            rawContent: serializeToHtml(document),
        })
    }
}
