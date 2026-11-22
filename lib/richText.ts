import sanitizeHtml from 'sanitize-html'

// Only what the RTE editor's serializeToHtml can produce is allowed.
// Everything else (script, img, iframe, on* attributes, url(...) styles, ...) is stripped.
const colorPattern = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i

const richTextOptions: sanitizeHtml.IOptions = {
    allowedTags: ['div', 'span', 'strong', 'em', 'u', 's', 'br'],
    allowedAttributes: {
        div: ['style'],
        span: ['style'],
    },
    allowedStyles: {
        div: {
            'text-align': [/^(left|center|right|justify)$/],
        },
        span: {
            'font-family': [/^[\w\s,()-]+$/],
            'font-size': [/^\d{1,3}px$/],
            'color': [colorPattern],
            'background-color': [colorPattern],
            'text-decoration': [/^overline$/],
        },
    },
    disallowedTagsMode: 'discard',
}

export function sanitizeRichTextHtml(html: string) {
    return sanitizeHtml(html, richTextOptions)
}

// Plain text version of rich text HTML, for API clients that only send `rawContent`.
// Every editor line is a <div>, so line ends become new lines.
export function richTextHtmlToPlainText(html: string) {
    const withLineBreaks = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
    const text = sanitizeHtml(withLineBreaks, { allowedTags: [], allowedAttributes: {} })
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Last, so '&amp;lt;' becomes '&lt;' and not '<'
        .replace(/&amp;/g, '&')
        .replace(/\n+$/, '')
}
