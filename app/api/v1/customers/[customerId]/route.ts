import type { NextRequest } from 'next/server'
import { deleteCustomer, getCustomer, updateCustomer } from '@/actions/customer'
import { apiResult, invalidBodyError, readJsonBody, requireApiToken } from '@/lib/api'

type Context = { params: Promise<{ customerId: string }> }
type UpdateCustomerInput = Parameters<typeof updateCustomer>[0]

// GET /api/v1/customers/{customerId}: customer, its counts and blog status counts
export async function GET(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { customerId } = await params
    return apiResult(await getCustomer({ customerId }))
}

// PATCH /api/v1/customers/{customerId}: only the sent fields change (null clears phone / company)
export async function PATCH(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    const { customerId } = await params
    const current = await getCustomer({ customerId })
    if (!current.customer) return apiResult(current)

    const { customer } = current
    const result = await updateCustomer({
        name: customer.name,
        surname: customer.surname,
        email: customer.email,
        phone: customer.phone ?? '',
        company: customer.company ?? '',
        ...body,
        customerId,
    } as UpdateCustomerInput)
    return apiResult(result)
}

// DELETE /api/v1/customers/{customerId}: soft delete, together with its blogs and notes
export async function DELETE(request: NextRequest, { params }: Context) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const { customerId } = await params
    return apiResult(await deleteCustomer({ customerId }))
}
