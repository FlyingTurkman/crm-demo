'use client'

import CustomerForm from '@/components/app/customers/CustomerForm'
import type { Customer } from '@/types'

export default function EditCustomerPageClient({ customer }: { customer: Customer }) {
    return (
        <CustomerForm customer={customer} />
    )
}
