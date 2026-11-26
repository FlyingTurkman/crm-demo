







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
// Menu search: results shown per category (customers, blogs, notes)
export const globalSearchCategoryLimit = 5

// Post status labels shown to users
export const postStatusLabels = {
    draft: 'Taslak',
    inReview: 'İncelemede',
    published: 'Yayında',
}

// Post types (what is delivered to the customer)
export const postTypeLabels = {
    socialMedia: 'Sosyal medya',
    blog: 'Blog yazısı',
    webPage: 'Web sayfası',
    newsletter: 'E-bülten',
    other: 'Diğer',
}

// Channels a post is produced for (several can be picked)
export const postPlatformLabels = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    pinterest: 'Pinterest',
    website: 'Web sitesi',
    email: 'E-posta',
    other: 'Diğer',
}

// Agenda (/app/agenda): a week of scheduled posts, one row per hour from the first to the last post
export const agendaDays = 7
// Hours shown for a week without scheduled posts (so new posts can still be added from the cells)
export const agendaDefaultStartHour = 8
export const agendaDefaultEndHour = 20
// Publish times (YYYY-MM-DDTHH:mm) are Türkiye time, whatever the server's time zone is
// (Vercel runs in UTC). Türkiye is UTC+3 all year (no daylight saving since 2016).
export const appUtcOffsetMinutes = 180

// Time picker step of a post's publish time (scheduledAt)
export const scheduleStepMinutes = 30

// Delivery filter of the post lists (?due=)
export const postDueFilters = ['overdue', 'week', 'none'] as const
export const postDueFilterLabels = {
    all: 'Tüm teslim tarihleri',
    overdue: 'Gecikenler',
    week: '7 gün içinde teslim',
    none: 'Teslim tarihi yok',
}
// Days counted as 'upcoming' (dashboard, ?due=week)
export const upcomingDueDays = 7

// Assignee filter of the post lists (?assignee=)
export const postAssigneeFilters = ['me', 'none'] as const
export const postAssigneeFilterLabels = {
    all: 'Tüm sorumlular',
    me: 'Bana atananlar',
    none: 'Sorumlu atanmamış',
}

// Post images (stored in S3, see lib/s3.ts)
export const maxPostImages = 10
// Uploads go through a Server Action: stays under Vercel's 4.5 MB request body limit
export const maxPostImageSizeMb = 4
export const maxPostImageSize = maxPostImageSizeMb * 1024 * 1024
export const maxImageNameLength = 200
export const postImageTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}
// S3 key of an uploaded post image, checked before a key is saved to a post
export const postImageKeyPattern = /^posts\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/

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

// Demo accounts shown on the login page (this is a demo app, change them for real use).
// Their API tokens are never published: a visitor creates one from the profile page after logging in.
export const demoAccounts = [
    { role: 'admin', email: 'admin@testmail.com', password: '12345678' },
    { role: 'moderator', email: 'moderator@testmail.com', password: '12345678' },
] as const

// Demo agency team (moderators) that posts are assigned to: npm run db:team-demo / db:seed.
// They can't log in with a known password (a random one is stored); an admin can reset it.
// '.test' is a reserved domain, so these addresses can never reach a real inbox.
export const demoTeamMembers = [
    { name: 'Elif', surname: 'Yıldız', email: 'elif.yildiz@ajans.test' },
    { name: 'Mert', surname: 'Şahin', email: 'mert.sahin@ajans.test' },
    { name: 'Zeynep', surname: 'Çelik', email: 'zeynep.celik@ajans.test' },
    { name: 'Burak', surname: 'Öztürk', email: 'burak.ozturk@ajans.test' },
    { name: 'Selin', surname: 'Arslan', email: 'selin.arslan@ajans.test' },
    { name: 'Emre', surname: 'Güneş', email: 'emre.gunes@ajans.test' },
] as const

// REST API (/api/v1): tokens start with this prefix so they are easy to recognise
export const apiTokenPrefix = 'crm_'
export const apiBasePath = '/api/v1'

// Project links shown on the login page (blob/HEAD always points to the default branch)
export const githubRepoUrl = 'https://github.com/FlyingTurkman/crm-demo'
export const githubReadmeUrl = 'https://github.com/FlyingTurkman/crm-demo/blob/HEAD/README.md'
export const githubApiDocsUrl = 'https://github.com/FlyingTurkman/crm-demo/blob/HEAD/api.md'
