# CLAUDE.md

## Stack
- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Database: MongoDB via Prisma **6.x** (Prisma 7+ does not support MongoDB — do not upgrade)
- Prisma schema: `prisma/schema.prisma`; shared client: `lib/prisma.ts` (always import `prisma` from `@/lib/prisma`, never instantiate `new PrismaClient()` elsewhere — the only exception is standalone CLI scripts in `lib/src/scripts/`, which run outside Next.js)

## Database rules
- **Every model must have an `isDeleted Boolean @default(false)` field.** Add it to any new model.
- **Soft delete only:** never call `delete` / `deleteMany` on records. To delete, set `isDeleted: true` with `update` / `updateMany`.
- **Text search uses `searchText`** (Turkish-insensitive: `ŞAHİN` = `sahin`, `IŞIK` = `isik`). `Customer`, `Post`, `Note` and `User` store a normalized copy of their searchable fields in `searchText`; search with `getSearchWhere(query)` from `lib/search.ts`, never with `contains` + `mode: 'insensitive'` on the original fields.
  - The field is maintained **only** by the Prisma extension `searchTextExtension` (`lib/src/searchText.ts`, applied in `lib/prisma.ts` and the CLI scripts): every `create` / `createMany` / `update` / `upsert` rebuilds it, a partial update reads the record back first. Never write `searchText` by hand; `updateMany` that touches a searchable field throws (use `update`).
  - A new searchable field or model: add it to `searchFields` in `lib/src/searchText.ts`, add `searchText String?` to the model, omit it in `lib/prisma.ts`, then run `npm run db:search-text`.
  - `searchText` is omitted from every query (global `omit` in `lib/prisma.ts`) and left out of the app types (`Omit<CustomerDB, 'searchText'>`), so it never reaches clients or the API.
- **Every read query must filter `isDeleted: false`** (`findMany`, `findFirst`, `count`, relation includes / `_count`, etc.) unless deleted records are explicitly needed.
- When soft-deleting a parent (e.g. `Customer`), also soft-delete its children (e.g. its `Note`s and `Post`s).
- Enum values are camelCase (e.g. `draft`, `inReview`, `published`), not UPPER_CASE.
- IDs: `String @id @default(auto()) @map("_id") @db.ObjectId`; foreign keys use `@db.ObjectId`.
- MongoDB has no migrations: apply schema changes with `npm run db:push`, then `npx prisma generate` runs automatically (or run it manually).

## Auth rules
- Login is for system users (`User` model) only — customers never log in. Roles: `admin`, `moderator` (`UserRole` enum).
- **Passwords are hashed with argon2 (`argon2id`)** via `lib/auth/password.ts` (`hashPassword`, `verifyPassword`). Never store or log a plain password, and never select the `password` field except to verify it.
- **No JWT.** Access and refresh tokens are opaque random tokens from our own generator in `lib/auth/token.ts` (`generateToken`: 96 random bytes → 128-char base64url).
- **Only the SHA-256 hash of a token is stored** in the `Session` model (`hashToken`); the raw token lives only in the cookie.
- Tokens are stored in **httpOnly cookies** (`access_token`: 15 min, `refresh_token`: 30 days), `secure` in production, `sameSite: lax`. Never expose tokens to client JS or return them from actions.
- **API tokens (REST API):** every user has one active `ApiToken` (`lib/auth/apiToken.ts`: `generateApiToken` → `crm_` + `generateToken()`, `validateApiToken`, `issueApiToken`). Only the SHA-256 hash is stored; issuing a new one soft-deletes the old one. Sent as `Authorization: Bearer <token>`; the API never accepts the session cookie.
  - `authorize()` uses the Bearer token when the header is present (never falling back to the cookie), otherwise the session cookie — so every action works for both the panel and the API.
  - The raw API token is the **only** token an action may return, and only right after it is generated (`createUser`, `regenerateApiToken`), to be shown once in `ApiTokenDialog`.
  - New users always get a token (`createUser`, `npm run user:create`). Deleting a user soft-deletes its API tokens too. **No token is ever hard-coded or published** (no fixed demo tokens, nothing on the login page): demo visitors create their own token on the profile page.
- **Routes:** `/` is the login page, `/app/**` is the protected panel where the whole application lives. Every new panel page goes under `app/app/`.
- `proxy.ts` runs on every request and validates the access token against the database:
  - guest on `/app/**` → redirect to `/`; logged-in user on `/` → redirect to `/app`
  - access token missing/expired but refresh token valid → rotates **both** tokens (old ones stop working immediately)
  - invalid tokens → both cookies are cleared
- After login redirect to `/app`, after logout redirect to `/` (via the action's `href`).
- Session helpers (`lib/auth/session.ts`): `createSession` / `deleteSession` (Server Actions only), `getCurrentUser()` (validates the access token, returns a censored `UserDto` or `null`), `rotateSession`.
- Logout soft-deletes the session (`isDeleted: true`) and clears the cookies.
- **Every Server Action (except `login` / `logout`) starts with a permission check** via `authorize(permission)` from `lib/auth/authorize.ts` — it checks both login and role:

  ```ts
  const auth = await authorize('customer:delete')
  if (!auth.user) {
      return { status: false, message: auth.message }
  }
  ```
- **Role permissions live only in `lib/auth/permissions.ts`** (`Permission` type, `rolePermissions`, `hasPermission`). Admin can do everything; moderator can do everything except `*:delete`, `user:*` and `apiToken:*` (the admin panel). `profile:*` (own account, `actions/profile.ts`) is for both roles; profile actions only ever touch `auth.user.id`. A new action needs a matching `Permission` (`<model>:read|create|update|delete`); change role rights there, never with `role === '...'` checks in actions.
- Client components may call `hasPermission(user?.role, ...)` only to hide UI (e.g. `EditDeleteMenu`'s `deletePermission` hides "Sil"); the real check is always `authorize()` in the action.
- Create users from the terminal with `npm run user:create`.
- **Demo accounts are shared:** `isDemoAccountEmail` (`lib/auth/demo.ts`) blocks changing their password and other sessions from the profile page, so one visitor can't lock the others out. Their API token can be (re)generated there, since it is the only way a visitor gets one.
- Changing your own password (`changePassword`) requires the current password and soft-deletes your other sessions (`getCurrentSessionId` keeps the current one).

## DTO rules
- **Data is censored with a DTO before it is sent to the client.** Never send a raw Prisma record of a sensitive model (e.g. `User`) to a client component or return it from a Server Action.
- DTOs are **classes** in `dtos/` (one file per model, e.g. `dtos/userDTO.ts`). The constructor copies only allowed fields and censors the sensitive ones; relations and internal fields (`isDeleted`, `sessions`, ...) are never copied.
- User DTOs (`dtos/userDTO.ts`):
  - `UserDto` — the user's own account data. `email` is masked with `maskEmail` (`test@testmail.com` → `t***@testmail.com`), `password` is always `PASSWORD_MASK` (`'***'`); the hash is never copied.
  - `PublicUserDto` — data safe to show to other users: no email, password, role or relations.
  - `ManagedUserDto` — a user as an admin sees it in the admin panel (`actions/user.ts`, `user:*` permissions only): unmasked email so it can be edited, never the password. User queries there use `omit: { password: true }` so the hash is never even read.
- **Admin panel (`/app/admin`)** manages system users. Its layout returns 404 unless the user has `user:read`; the menu item is hidden the same way. An admin can't delete their own account or remove their own admin role; deleting a user (and an admin resetting someone's password) soft-deletes their sessions so they are logged out at once.
- **Next.js can't pass class instances to client components or return them from Server Actions** ("Only plain objects ... can be passed to Client Components"). Spread the DTO into a plain object at that boundary — the censoring already happened in the constructor:

  ```ts
  return { status: true, user: { ...new UserDto(user) } }   // Server Action
  <SiteProvider initialUser={user ? { ...user } : null}>     // Server → client props
  ```
- Type client-side data with the DTO class type (`UserDto`, `PublicUserDto`), not the Prisma type.

## Type rules
- All model types live in `types.d.ts` at the project root and are imported with `import type { Customer } from '@/types'`.
- Import Prisma's generated types with a `DB` suffix alias (`Customer as CustomerDB`) — they contain DB fields only.
- Export the app type with the **same PascalCase name as the model** (`Customer`, `Note`, `Post`), extending the DB type with **optional** relations (and `_count` where used):

  ```ts
  import type { Customer as CustomerDB, Post as PostDB } from '@prisma/client'

  export type Customer = CustomerDB & {
      posts?: Post[]
  }

  export type Post = PostDB & {
      customer?: Customer
  }
  ```
- When adding a new model to the schema, add its type to `types.d.ts` the same way.

## Content (Post) rules
- A `Post` is a deliverable of an agency to its customer. The UI calls it **İçerik** (never "Blog"); routes stay `/app/blogs` and `/api/v1/posts`.
- Fields: `type` (`PostType`: `socialMedia`, `blog`, `webPage`, `newsletter`, `other`, labels `postTypeLabels`), `platforms` (`PostPlatform[]`, multi-select channels: `instagram`, `tiktok`, ..., labels `postPlatformLabels`, icons `PostPlatformIcon`; filter with `{ platforms: { has } }`), `dueDate` (start of the delivery day, sent as `YYYY-MM-DD`, parsed with `parseDayValue`), `scheduledAt` (planned publish date-time, sent as `YYYY-MM-DDTHH:mm`, `parseDateTimeValue` / `toDateTimeValue`; the agenda `/app/agenda` (`getAgenda`) is built on it — there is no separate appointment model), `assigneeId` (a `User`; sent to clients only as `PublicUserDto` via the `assignee` include with `omit: { password: true }`), `images` (`PostImage[]` composite type).
- **Overdue** = `dueDate` before today and `status !== 'published'`. Use `isPostOverdue` / `getOverdueWhere` / `getUpcomingWhere` / `getDueWhere` from `lib/period.ts`, never re-implement the rule.
- Optional fields are always written explicitly (`null`), so `{ dueDate: null }` filters work; old documents are fixed with `npm run db:posts-backfill`.

## File upload (S3) rules
- Files go to S3 only through Server Actions (`uploadPostImage` in `actions/post.ts`) using `lib/s3.ts` (server only, credentials from `.env`). Never expose AWS credentials or use them in client code; the browser only gets `NEXT_PUBLIC_AWS_S3_BUCKET_URL` (`getImageUrl` in `lib/images.ts`).
- Check the real file type from its bytes (`detectImageType`), never trust `file.type` or the name. Keys are random (`posts/<uuid>.<ext>`, `postImageKeyPattern`), never built from the file name.
- When saving keys to a record, validate the pattern and confirm new keys exist with `headObject`; take size / type from S3, not from the client.
- Limits live in `constants.ts` (`maxPostImages`, `maxPostImageSizeMb`); `next.config.ts` sets the Server Action body limit from it. S3 objects are never deleted (soft delete).
- Images are shown with `next/image`; `next.config.ts` allows only the bucket host.

## Data access rules
- **The panel uses Server Actions, never API routes.** The only route handlers are the REST API in `app/api/v1/**/route.ts` (for external clients); don't add route handlers anywhere else.
- **REST API (`app/api/v1`) rules:**
  - Resource-based RESTful paths: `GET/POST /customers`, `GET/PATCH/DELETE /customers/{id}`, children under their parent (`/customers/{id}/posts`, `/customers/{id}/notes`). `PATCH` is a partial update: load the record with its get action, merge the body over it, then call the update action. Path ids always override body ids.
  - Route handlers contain **no business logic**: they call the existing Server Actions (so zod, `authorize`, soft delete, `pageLimit` and `revalidatePath` are shared) and use the helpers in `lib/api.ts` (`requireApiToken`, `readJsonBody`, `getQueryParam`, `withRichText`, `apiResult`). Every handler starts with `requireApiToken(request)`.
  - `apiResult` maps action results to HTTP codes (201 on create, 400 validation, 401/403 from `authorize` messages, 404 `... bulunamadı`, 409 duplicates) and strips the panel-only `href`.
  - CORS is open to every origin (`*`) via `headers()` in `next.config.ts` for `/api/v1/:path*`. This is safe only because the API never reads cookies: never add `Access-Control-Allow-Credentials` or cookie auth to the API.
  - A new action that should be reachable from the API gets a route here and is documented in `api.md` (endpoint table, and body fields / list params if new). `api.md` holds only API usage docs; the README just links to it.
- Put actions in `actions/` at the project root, one file per model (e.g. `actions/customer.ts`, `actions/post.ts`), each starting with `'use server'`.
- Declare actions as `export async function` (no arrow functions).
- After a mutation (create / update / soft delete), call `revalidatePath` for the affected pages.
- **Prisma + MongoDB bug:** `groupBy` with `orderBy: { _count: ... }` and `take` returns arbitrary, unsorted groups. For "top N by count" use `aggregateRaw` with `$group` → `$sort` → `$limit` (see `topCustomers` in `actions/dashboard.ts`).
- **Prisma + MongoDB null comparisons:** `lt` / `lte` on a nullable field also match `null` (null sorts below every value). Add `not: null` (see `getOverdueWhere` in `lib/period.ts`).
- **Every list query is limited to at most `pageLimit` (50, `lib/src/constants.ts`) records** — never a `findMany` without `take`. Lists that can grow past it are paginated: the action takes a `page`, returns `total`, `page` and `pageCount` (`skip: (page - 1) * pageLimit, take: pageLimit`, a page past the end falls back to the last one), and the page uses `components/app/common/ListPagination.tsx` with the page in `?page=` (via `use-search-query`). Smaller fixed limits (`sidebarCustomerLimit`, `searchResultLimit`) stay as they are.

## Validation rules
- **Client side: `react-hook-form`** for every form (`useForm`, `register`, `handleSubmit`, `formState.errors`).
- **Server side: `zod`** in every Server Action that receives input. Validate with `safeParse` before touching the database; never trust client-side validation alone.
- Define the zod schema in the action file (not exported — `'use server'` files may only export async functions) and type the input with `z.input<typeof schema>`.
- Messages are in Turkish since they are shown to users.

## Constants rules
- **Global values live in `lib/src/constants.ts`** (camelCase `export const`, grouped with a comment), e.g. `minPasswordLength`, `maxPasswordLength`.
- **Never hard-code limits in validations or messages.** Both the check and its error message must use the constant, in `react-hook-form` rules, zod schemas and scripts alike:

  ```ts
  import { maxPasswordLength, minPasswordLength } from '@/lib/src/constants'

  password: z
      .string()
      .min(minPasswordLength, `Şifreniz en az ${minPasswordLength} karakter uzunluğunda olmalıdır`)
      .max(maxPasswordLength, `Şifreniz en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`)
  ```
- When a new limit is needed (name length, page size, ...), add it to `constants.ts` first, then use it.
- `lib/src/` holds project-wide sources: `constants.ts` and CLI scripts in `lib/src/scripts/` (run with plain Node, so they import local files with the `.ts` extension, e.g. `'../constants.ts'`).

## Server Action response rules
- **Every Server Action returns the global `Response` type** from `types.d.ts`: `{ status: boolean, message?: string }`.
- To return extra fields, **extend `Response` inside that action's file, only for that action** — never add action-specific fields to the global `Response` type:

  ```ts
  type CreateCustomerResponse = Response & {
      customer?: Customer
      href?: string
  }

  export async function createCustomer(input: z.input<typeof createCustomerSchema>): Promise<CreateCustomerResponse> {
      // ...
      return { status: true, message: 'Müşteri oluşturuldu', customer, href: `/customers/${customer.id}` }
  }
  ```
- Name the extended type `<ActionName>Response` (e.g. `GetCustomersResponse`) and define it in the action's file.
- On failure (validation, duplicate, etc.) return `{ status: false, message }`.

## Page rules
Every route folder has **two files** — a server page and a client page (reference: `app/app/`):

```
app/app/
├── page.tsx          → server page
└── page.client.tsx   → client page
```

- **`page.tsx` (server page)**
  - No `'use client'` — it is a Server Component.
  - Default export is always named **`Page`**.
  - Does server-side work (e.g. calling Server Actions / `getCurrentUser()` to load data) and only renders its client page, passing data as props.
  - Imports the client page with a relative path: `import AppPageClient from './page.client'`.
- **`page.client.tsx` (client page)**
  - First line is `'use client'`.
  - Default export is named **`<FolderName>PageClient`** in PascalCase (`app` → `AppPageClient`, `customers` → `CustomersPageClient`). The root page (`app/page.client.tsx`, the login page at `/`) is named `LoginPageClient`.
  - Holds the UI, state, forms (`react-hook-form`) and event handlers, following the `.tsx` component order (state → design → functions).

- **Every `page.tsx` sets a page title — title only, no description / Open Graph (the app has no public / ad pages).** The root layout's template shows it as `<title> | CRM`.
  - Static pages: `export const metadata: Metadata = { title: 'Müşteriler' }`.
  - Pages of a record: `generateMetadata` with `getCustomerPageTitle(customerId, 'Bloglar')` / `getPostPageTitle(postId, 'Düzenle')` from `lib/data.ts` (e.g. `Ahmet Yılmaz - Bloglar`).
- **Every route folder with a `page.tsx` (and every section layout folder) also has a `loading.tsx`** that only renders `<RouteSkeleton scope='...' />` (`components/app/skeletons/RouteSkeleton.tsx`). It picks the skeleton of the target page from the URL; `scope` tells it which layouts are already on screen:
  - `'app'` — `app/app/loading.tsx` (only the main menu above): also draws the section sidebar / bar and the customer header.
  - `'section'` — section roots (`customers`, `blogs`, `notes`, `admin`): also draws the customer header for `/app/customers/<id>/**`.
  - `'content'` — every deeper folder: only the page.
  - A new page gets a `loading.tsx` and, if its shape is new, a skeleton in `components/app/skeletons/` and a case in `getPageSkeleton`.
- **Server components read a record with the `cache()`d getters in `lib/data.ts`** (`getCustomerCached`, `getPostCached`, `getNoteCached`) so a layout, its page and `generateMetadata` share one database query per request.

```tsx
// page.tsx
import AppPageClient from './page.client'

export default function Page() {
    return (
        <AppPageClient />
    )
}
```

```tsx
// page.client.tsx
'use client'

export default function AppPageClient() {
    return (
        <div>
        </div>
    )
}
```

## UI rules
- **UI is built with shadcn/ui** (style `base-nova`, Base UI primitives, `lucide-react` icons; config in `components.json`).
- Add components with `npx shadcn@latest add <component>` — they go to `components/ui/`. Always use a shadcn component when one exists instead of writing raw HTML elements / custom ones (`Button`, `Input`, `Form`, `Card`, `Table`, `Dialog`, `Select`, `Badge`, ...).
- Merge class names with `cn` from `@/lib/utils`.
- **Server Action messages are shown with shadcn's Sonner toast** — never with local state like `setServerMessage`. `<Toaster />` is mounted once in `app/layout.tsx`.

  ```tsx
  import { toast } from 'sonner'

  const result = await login(values)
  if (!result.status) {
      toast.error(result.message ?? 'Giriş yapılamadı')
      return
  }
  toast.success(result.message ?? 'Giriş yapıldı')
  ```
- Field-level validation errors from `react-hook-form` stay inline under the field (`FieldError`), not in a toast.
- **Required fields** are marked with the global `required` class on the label (`<FieldLabel className='required'>Ad</FieldLabel>`, defined in `app/globals.css`), which adds a red (`--destructive`) asterisk. Never type ` *` into label text.
- **Page loading uses shadcn's `Skeleton`** (through the `loading.tsx` files above), shaped like the page that is coming.
- **Loading animations inside a page (buttons, search results, ...) use shadcn's `Spinner`** (`@/components/ui/spinner`) — never a custom spinner or a text-only loading state. In buttons, show it before the label and disable the button while loading:

  ```tsx
  <Button type='submit' disabled={isSubmitting}>
      {isSubmitting && <Spinner />}
      {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
  </Button>
  ```
- **Every panel that opens from a button (search bars, the customer picker, date pickers) goes through `ResponsivePopover`** (`components/app/common/ResponsivePopover.tsx`): a `Popover` on desktop, a bottom sheet (shadcn `Drawer`) on mobile that sits above the on-screen keyboard. Give it a `title` (the drawer's heading). Never use `Popover` directly in our components.
- **Every search bar is a `ResponsivePopover` + `Command`** (reference: `components/app/customers/CustomerSearchBar.tsx`; `CustomerPicker` is the form-field version that picks a customer instead of navigating; `components/app/layout/GlobalSearch.tsx` in the main menu searches customers, blogs and notes at once through `searchAll` in `actions/search.ts`, grouped with `CommandGroup`, Ctrl+K opens it):
  - Trigger styled with `buttonVariants({ variant: 'secondary' })` (`triggerClassName`), label + `IoSearch` icon; `modal` on desktop.
  - Inside `PopoverContent`: `<Command shouldFilter={false}>` (filtering is done on the server), `CommandInput`, results as `CommandItem`s in `CommandList`, `CommandEmpty` when nothing matches, `Spinner` while loading.
  - Searching is **debounced** with `searchDebounceMs` from `constants.ts` (`setTimeout` in `useEffect`, cleared in the cleanup, stale responses ignored) and runs through a Server Action validated with zod (`maxSearchLength`, results limited by `searchResultLimit`).

  ```tsx
  <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={buttonVariants({ variant: 'secondary' })}>
          Müşteri ara <IoSearch />
      </PopoverTrigger>
      <PopoverContent>
          <Command shouldFilter={false}>
              <CommandInput placeholder='...' value={query} onValueChange={handleQueryChange} />
              <CommandList>
                  {/* Spinner / CommandEmpty / CommandItem results */}
              </CommandList>
          </Command>
      </PopoverContent>
  </Popover>
  ```
- **Rich text (blogs, notes) uses the RTE editor** through our wrapper `components/app/editor/RichTextEditor.tsx` (load it with `next/dynamic` + `ssr: false`, see `PostForm.tsx`). Never use the `components/rte` parts directly in pages.
  - Models with rich text store two fields: `content` = plain text (`serializeToPlainText`, for previews/search) and `rawContent` = HTML (`serializeToHtml`).
  - **`rawContent` is always sanitized on the server with `sanitizeRichTextHtml` (`lib/richText.ts`) before saving** — it is later rendered with `RichTextView` (`dangerouslySetInnerHTML`).
  - The editor can't read HTML; `htmlToDocument` turns saved `rawContent` back into the editor document for edit forms.
  - `components/rte/` comes from the RTE registry (`npx shadcn add https://rte-shadcn.vercel.app/r/rte.json`); its toggle groups and selects were adapted to Base UI (array values, `multiple`). Re-installing it overwrites those fixes.
- Files in `components/ui/` are generated by shadcn: they are **exempt from the code style rules** below (quotes, semicolons, arrow functions). Don't reformat them; customize by wrapping them in our own components.
- **`components/ui/` is only for shadcn.** Never put our own components there.
- **Our own components live in `components/app/`**, grouped by area in subfolders, file and component named in PascalCase (`components/app/layout/MainMenu.tsx` → `MainMenu`). They follow all code style rules and import shadcn parts with the alias: `import { Button } from '@/components/ui/button'`.

  ```
  components/
  ├── ui/              → shadcn (generated, don't edit style)
  └── app/
      ├── context/
      │   └── SiteContext.tsx
      └── layout/
          └── MainMenu.tsx
  ```

## Global state (context) rules
- Global client state lives in **`SiteContext`** (`components/app/context/SiteContext.tsx`). `SiteProvider` wraps the whole app in `app/layout.tsx`.
- Read and update it **only through the `useSiteContext()` hook** — never `useContext(SiteContext)` directly:

  ```tsx
  const { user, setUser } = useSiteContext()
  ```
- Current states: `user` (`UserDto | null` — the logged-in user censored by `UserDto`: masked email, password `'***'`) and `setUser`.
  - Initial `user` comes from `getCurrentUser()` in the root layout (server).
  - Layouts don't re-render on client navigation, so actions that change the user must also update the context: on login call `setUser(result.user)`, on logout `setUser(null)`.
- New global states are added to `SiteContext` (state + setter in `SiteContextValue`) instead of creating new contexts.
- Use `useSiteContext()` in client components (`'use client'`); server code uses `getCurrentUser()`.
- Style with Tailwind classes and the theme CSS variables in `app/globals.css` (`bg-primary`, `text-muted-foreground`, ...), not hard-coded colors.

## Code style rules
- **Never use arrow functions — the only exception is `.map` callbacks.** Use `function` declarations everywhere else, including other callbacks:
  `useEffect(function () { ... }, [])`, `items.filter(function (item) { ... })`.
- **Never use semicolons (`;`).** Since there are no semicolons, never start a line with `(`, `[` or `` ` `` — restructure the code instead (e.g. assign to a variable first).
- **Use single quotes (`'`) for strings** — in imports, directives (`'use server'`, `'use client'`), JS strings and JSX attributes (`className='...'`). Use double quotes (`"`) only when necessary, i.e. when the string itself contains a single quote (e.g. `"Müşteri'nin kaydı"`). Template literals (`` ` ``) are used only for interpolation.
- **`.tsx` component order** — inside every component, in this order:
  1. **State** — `useState`, `useRef`, other hooks and derived values
  2. **Design** — the `return ( ...JSX... )`
  3. **Functions** — event handlers and helpers, declared with `function` *after* the `return` (function declarations are hoisted, so the JSX can reference them)

  ```tsx
  export default function CustomerForm() {
      const [name, setName] = useState('')

      return (
          <form onSubmit={handleSubmit}>
              <input value={name} onChange={handleChange} />
          </form>
      )

      function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
          setName(e.target.value)
      }

      function handleSubmit(e: React.FormEvent) {
          e.preventDefault()
      }
  }
  ```

- **Mapping lists in JSX** — use an arrow function in `.map` with a `key` from the record `id`:

  ```tsx
  export default function PostList({ posts }: { posts: Post[] }) {
      return (
          <ul>
              {posts.map((post) => (
                  <li key={post.id}>
                      <h3>{post.title}</h3>
                      <span>{post.status}</span>
                  </li>
              ))}
          </ul>
      )
  }
  ```

## Commands
- `npm run dev` — dev server
- `npm run db:push` — sync schema to MongoDB
- `npm run db:studio` — Prisma Studio
- `npm run user:create` — create a login user (admin / moderator) interactively, prints its API token once
- `npm run db:seed -- --yes` — reset to demo data: replaces customers / blogs / notes with generated ones and keeps only the demo accounts (hard-deletes: a setup tool, not app code)
- `npm run db:search-text` — fill / repair `searchText` of every record (after adding the field, restoring an old backup or changing `normalizeSearchText`); only outdated records are written, `updatedAt` isn't touched. `db:restore` and `db:seed` run it too
- `npm run db:backup` / `npm run db:restore -- backups/<date>` — JSON (Extended JSON) backup of every collection / restore into empty collections (`backups/` is git-ignored: it has password and token hashes)
- `npm run api:tokens` — give users without an API token a new one (`--force` regenerates all tokens)
- `npm run db:team-demo` — create the demo agency team (`demoTeamMembers`, moderators with random, never printed passwords); `db:seed` keeps them
- `npm run db:platforms-demo` — give posts without channels 1–3 random social media platforms (`-- --all` redoes every post)
- `npm run db:assign-demo` — assign users to posts without an assignee, round-robin (`-- --all` reassigns every post)
- `npm run db:schedule-demo` — give about half of the open, unscheduled posts a publish time in the next 14 days (fills the agenda)
- `npm run db:posts-backfill` — write defaults (`type`, `platforms`, `dueDate`, `scheduledAt`, `assigneeId`, `images`) to posts created before those fields existed
