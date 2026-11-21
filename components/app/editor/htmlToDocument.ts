import { createRunId, type RTEDocument, type RTERun, type RTETextAlign } from '@/components/rte/rte-engine'

// The editor can serialize to HTML but can't read HTML back.
// This reverses serializeToHtml: one <div style="text-align"> per line, inside it
// <strong>/<em>/<u>/<s> marks and an optional <span style> for font, size, colors and overline.
// Runs only in the browser (uses DOMParser).

type RunStyle = Omit<RTERun, 'id' | 'text' | 'align'>

const alignValues: RTETextAlign[] = ['left', 'center', 'right', 'justify']

const tagFormats: Record<string, string> = {
    STRONG: 'bold',
    B: 'bold',
    EM: 'italic',
    I: 'italic',
    U: 'underline',
    S: 'strikethrough',
}

const defaultStyle: RunStyle = {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: 'inherit',
    markerColor: 'transparent',
    format: [],
}

export function htmlToDocument(html: string): RTEDocument | undefined {
    if (!html) {
        return undefined
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html')
    const lines = Array.from(parsed.body.children).filter(function (element) {
        return element.tagName === 'DIV'
    })
    const runs: RTERun[] = []

    lines.forEach(function (line, index) {
        const align = getAlign(line as HTMLElement)

        if (index > 0) {
            runs.push({ ...defaultStyle, format: [], id: createRunId(), text: '\n', align })
        }
        collectRuns(line, defaultStyle, align, runs)
    })

    if (runs.length === 0) {
        return undefined
    }
    return { runs }
}

function getAlign(element: HTMLElement): RTETextAlign {
    const value = element.style.textAlign as RTETextAlign
    return alignValues.includes(value) ? value : 'left'
}

function collectRuns(node: Node, style: RunStyle, align: RTETextAlign, runs: RTERun[]) {
    node.childNodes.forEach(function (child) {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent ?? ''
            if (text) {
                runs.push({ ...style, format: [...style.format], id: createRunId(), text, align })
            }
            return
        }

        if (child.nodeType !== Node.ELEMENT_NODE) {
            return
        }

        const element = child as HTMLElement
        // <br /> only marks an empty line, the line break itself comes from the next <div>
        if (element.tagName === 'BR') {
            return
        }

        collectRuns(element, getChildStyle(element, style), align, runs)
    })
}

function getChildStyle(element: HTMLElement, parent: RunStyle): RunStyle {
    const style: RunStyle = { ...parent, format: [...parent.format] }
    const format = tagFormats[element.tagName]

    if (format && !style.format.includes(format)) {
        style.format.push(format)
    }

    if (element.tagName === 'SPAN') {
        if (element.style.fontFamily) {
            style.fontFamily = element.style.getPropertyValue('font-family')
        }
        if (element.style.fontSize) {
            style.fontSize = element.style.fontSize
        }
        if (element.style.color) {
            style.color = element.style.color
        }
        if (element.style.backgroundColor) {
            style.markerColor = element.style.backgroundColor
        }
        if (element.style.textDecoration.includes('overline') && !style.format.includes('overline')) {
            style.format.push('overline')
        }
    }

    return style
}
