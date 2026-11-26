'use client'

import { deleteCustomer } from '@/actions/customer'
import EditDeleteMenu from '@/components/app/common/EditDeleteMenu'
import type { Customer } from '@/types'

export default function CustomerActionsMenu({ customer }: { customer: Customer }) {
    return (
        <EditDeleteMenu
            editLabel='Bilgileri Düzenle'
            editHref={`/app/customers/${customer.id}/edit`}
            deleteDescription={`${customer.fullName} adlı müşteri, notları ve içerikleri ile birlikte silinecek.`}
            deletePermission='customer:delete'
            onDelete={handleDelete}
        />
    )

    function handleDelete() {
        return deleteCustomer({ customerId: customer.id })
    }
}
