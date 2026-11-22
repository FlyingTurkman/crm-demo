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

// Extend with optional relations
export type Customer = CustomerDB & {
    notes?: Note[]
    posts?: Post[]
    _count?: { notes?: number; posts?: number }
}

export type Note = NoteDB & {
    customer?: Customer
}

export type Post = PostDB & {
    customer?: Customer
}

export type User = UserDB & {
    sessions?: Session[]
    apiTokens?: ApiToken[]
}

export type Session = SessionDB & {
    user?: User
}


export type ApiToken = ApiTokenDB & {
    user?: User
}
