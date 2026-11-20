"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { Customer, Response } from "@/types"

const createCustomerSchema = z.object({
    name: z.string().trim().min(1, "Ad zorunludur"),
    surname: z.string().trim().min(1, "Soyad zorunludur"),
    email: z.email("Geçerli bir email girin"),
    phone: z.string().trim().optional(),
    company: z.string().trim().optional(),
})

type GetCustomersResponse = Response & {
    customers?: Customer[]
}

type CreateCustomerResponse = Response & {
    customer?: Customer
}

export async function getCustomers(): Promise<GetCustomersResponse> {
    const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { posts: { where: { isDeleted: false } } } } },
    })
    return { status: true, customers }
}

export async function createCustomer(input: z.input<typeof createCustomerSchema>): Promise<CreateCustomerResponse> {
    const parsed = createCustomerSchema.safeParse(input)
    if (!parsed.success) {
        return { status: false, message: parsed.error.issues[0].message }
    }

    const { name, surname, email, phone, company } = parsed.data

    try {
        const customer = await prisma.customer.create({
            data: {
                name,
                surname,
                fullName: `${name} ${surname}`,
                email,
                phone,
                company,
            },
        })
        revalidatePath("/")
        return { status: true, message: "Müşteri oluşturuldu", customer }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { status: false, message: "Bu email ile kayıtlı bir müşteri zaten var" }
        }
        throw error
    }
}
