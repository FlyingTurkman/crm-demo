# CLAUDE.md

## Stack
- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Database: MongoDB via Prisma **6.x** (Prisma 7+ does not support MongoDB — do not upgrade)
- Prisma schema: `prisma/schema.prisma`; shared client: `lib/prisma.ts` (always import `prisma` from `@/lib/prisma`, never instantiate `new PrismaClient()` elsewhere — the only exception is standalone CLI scripts in `lib/src/scripts/`, which run outside Next.js)

## Database rules
- **Every model must have an `isDeleted Boolean @default(false)` field.** Add it to any new model.
- **Soft delete only:** never call `delete` / `deleteMany` on records. To delete, set `isDeleted: true` with `update` / `updateMany`.
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
- **Routes:** `/` is the login page, `/app/**` is the protected panel where the whole application lives. Every new panel page goes under `app/app/`.
- `proxy.ts` runs on every request and validates the access token against the database:
  - guest on `/app/**` → redirect to `/`; logged-in user on `/` → redirect to `/app`
  - access token missing/expired but refresh token valid → rotates **both** tokens (old ones stop working immediately)
  - invalid tokens → both cookies are cleared
- After login redirect to `/app`, after logout redirect to `/` (via the action's `href`).
- Session helpers (`lib/auth/session.ts`): `createSession` / `deleteSession` (Server Actions only), `getCurrentUser()` (validates the access token, returns user without password or `null`), `rotateSession`.
- Logout soft-deletes the session (`isDeleted: true`) and clears the cookies.
- Every Server Action that requires login must call `getCurrentUser()` first and return `{ status: false, message }` if it is `null` or the role is not allowed.
- Create users from the terminal with `npm run user:create`.

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

## Data access rules
- **Use Server Actions, never API routes.** Do not create `app/api/**/route.ts` files.
- Put actions in `actions/` at the project root, one file per model (e.g. `actions/customer.ts`, `actions/post.ts`), each starting with `'use server'`.
- Declare actions as `export async function` (no arrow functions).
- After a mutation (create / update / soft delete), call `revalidatePath` for the affected pages.

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
- **Loading animations use shadcn's `Spinner`** (`@/components/ui/spinner`) — never a custom spinner or a text-only loading state. In buttons, show it before the label and disable the button while loading:

  ```tsx
  <Button type='submit' disabled={isSubmitting}>
      {isSubmitting && <Spinner />}
      {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
  </Button>
  ```
- Files in `components/ui/` are generated by shadcn: they are **exempt from the code style rules** below (quotes, semicolons, arrow functions). Don't reformat them; customize by wrapping them in our own components.
- **`components/ui/` is only for shadcn.** Never put our own components there.
- **Our own components live in `components/app/`**, grouped by area in subfolders, file and component named in PascalCase (`components/app/layout/MainMenu.tsx` → `MainMenu`). They follow all code style rules and import shadcn parts with the alias: `import { Button } from '@/components/ui/button'`.

  ```
  components/
  ├── ui/              → shadcn (generated, don't edit style)
  └── app/
      └── layout/
          └── MainMenu.tsx
  ```
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
- `npm run user:create` — create a login user (admin / moderator) interactively
