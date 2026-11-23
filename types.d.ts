// Prisma generated types (DB fields only)
import type {
    Customer as CustomerDB,
    Note as NoteDB,
    Post as PostDB,
    User as UserDB,
    Session as SessionDB,
    ApiToken as ApiTokenDB,
} from '@prisma/client'


// Global backend response type
export type Response = {
    status: boolean
    message?: string
}

// Extend with optional relations. `searchText` is left out: lib/prisma.ts omits it from every
// query (internal search index, see lib/src/searchText.ts)
export type Customer = Omit<CustomerDB, 'searchText'> & {
    notes?: Note[]
    posts?: Post[]
    _count?: { notes?: number; posts?: number }
}

export type Note = Omit<NoteDB, 'searchText'> & {
    customer?: Customer
}

export type Post = Omit<PostDB, 'searchText'> & {
    customer?: Customer
}

export type User = Omit<UserDB, 'searchText'> & {
    sessions?: Session[]
    apiTokens?: ApiToken[]
}

export type Session = SessionDB & {
    user?: User
}


export type ApiToken = ApiTokenDB & {
    user?: User
}
