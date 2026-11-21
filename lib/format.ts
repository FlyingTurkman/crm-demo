export function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Notes have no title: their first non-empty line is used as one in lists
export function getNotePreview(content: string) {
    const firstLine = content.split('\n').find(function (line) {
        return line.trim().length > 0
    })
    return firstLine?.trim() || 'Boş not'
}

export function formatTime(date: Date | string) {
    return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(date: Date | string) {
    return new Date(date).toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}
