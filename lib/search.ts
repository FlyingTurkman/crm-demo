// Prisma sends `contains` to MongoDB as a regex without escaping it:
// '(' would crash the query and '.' would match everything
export function escapeRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
