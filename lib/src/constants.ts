







// Password length
export const minPasswordLength = 8
export const maxPasswordLength = 50

// Email format
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/


// Customer field lengths
export const maxNameLength = 50
export const maxCompanyLength = 100
export const maxPhoneLength = 20

// Max number of records fetched by a single list query (page size of every paginated list)
export const pageLimit = 50

// Customers sidebar
export const sidebarCustomerLimit = 20

// Search
export const searchDebounceMs = 300
export const maxSearchLength = 100
export const searchResultLimit = 10

// Post status labels shown to users
export const postStatusLabels = {
    draft: 'Taslak',
    inReview: 'İncelemede',
    published: 'Yayında',
}

// Post (blog) limits
export const maxPostTitleLength = 200
export const maxPostContentLength = 20000

// Note limits
export const maxNoteContentLength = 5000

// Max size of the editor's HTML output (rawContent), guards against huge payloads
export const maxRawContentLength = 900000

// MongoDB ObjectId format (24 hex characters), checked before ids reach Prisma
export const objectIdPattern = /^[0-9a-f]{24}$/i

// Customer list sorting
export const customerSorts = ['updated', 'created', 'name'] as const
export const customerSortLabels = {
    updated: 'Son güncellenen',
    created: 'Son eklenen',
    name: 'Ada göre (A-Z)',
}

// Blog list sorting
export const postSorts = ['updated', 'created', 'title'] as const
export const postSortLabels = {
    updated: 'Son güncellenen',
    created: 'Son eklenen',
    title: 'Başlığa göre (A-Z)',
}

// Blogs sidebar
export const sidebarPostLimit = 20

// Note list sorting
export const noteSorts = ['updated', 'created'] as const
export const noteSortLabels = {
    updated: 'Son güncellenen',
    created: 'Son eklenen',
}

// Notes sidebar
export const sidebarNoteLimit = 20

// 'Created at' filter of the lists (?period=)
export const createdPeriods = ['today', 'week', 'month'] as const
export const createdPeriodLabels = {
    all: 'Tüm zamanlar',
    today: 'Bugün eklenenler',
    week: 'Son 7 gün',
    month: 'Son 30 gün',
}

// Dashboard
export const dashboardListLimit = 5

// System users (admin panel)
export const userRoleLabels = {
    admin: 'Admin',
    moderator: 'Moderatör',
}
export const userSorts = ['updated', 'created', 'name'] as const
export const userSortLabels = {
    updated: 'Son güncellenen',
    created: 'Son eklenen',
    name: 'Ada göre (A-Z)',
}
export const sidebarUserLimit = 20

// Demo accounts shown on the login page (this is a demo app, change them for real use)
// Their API tokens are fixed so they can be published too: `npm run api:tokens` writes them to the database
export const demoAccounts = [
    { role: 'admin', email: 'admin@testmail.com', password: '12345678', apiToken: 'crm_demo_admin_api_token' },
    { role: 'moderator', email: 'moderator@testmail.com', password: '12345678', apiToken: 'crm_demo_moderator_api_token' },
] as const

// REST API (/api/v1): tokens start with this prefix so they are easy to recognise
export const apiTokenPrefix = 'crm_'
export const apiBasePath = '/api/v1'

// Project links shown on the login page (blob/HEAD always points to the default branch)
export const githubRepoUrl = 'https://github.com/FlyingTurkman/crm-demo'
export const githubReadmeUrl = 'https://github.com/FlyingTurkman/crm-demo/blob/HEAD/README.md'
export const githubApiDocsUrl = 'https://github.com/FlyingTurkman/crm-demo/blob/HEAD/api.md'
