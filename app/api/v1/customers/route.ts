import type { NextRequest } from 'next/server'
import { createCustomer, getCustomers } from '@/actions/customer'
import { apiResult, getQueryParam, invalidBodyError, readJsonBody, requireApiToken } from '@/lib/api'

type GetCustomersInput = Parameters<typeof getCustomers>[0]
type CreateCustomerInput = Parameters<typeof createCustomer>[0]

// GET /api/v1/customers?q=&postStatus=&period=&sort=&page=
export async function GET(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const result = await getCustomers({
        query: getQueryParam(request, 'q'),
        postStatus: getQueryParam(request, 'postStatus'),
        period: getQueryParam(request, 'period'),
        sort: getQueryParam(request, 'sort'),
        page: getQueryParam(request, 'page'),
    } as GetCustomersInput)
    return apiResult(result)
}

// POST /api/v1/customers  { name, surname, email, phone?, company? }
export async function POST(request: NextRequest) {
    const unauthorized = requireApiToken(request)
    if (unauthorized) return unauthorized

    const body = await readJsonBody(request)
    if (!body) return invalidBodyError()

    const result = await createCustomer(body as CreateCustomerInput)
    return apiResult(result, 201)
}
