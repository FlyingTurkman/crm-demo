import { cn } from '@/lib/utils'

// Renders the editor's HTML output (rawContent).
// Safe to inject: rawContent is sanitized with sanitizeRichTextHtml before it is saved.
export default function RichTextView({ html, className }: { html: string, className?: string }) {
    return (
        <div
            className={cn('text-sm leading-relaxed break-words', className)}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}
