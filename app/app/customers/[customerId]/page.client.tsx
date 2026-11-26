'use client'

import type { PostStatus } from '@prisma/client'
import PostStatusChart from '@/components/app/customers/PostStatusChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Customer } from '@/types'

export default function CustomerPageClient({
    customer,
    postStatusCounts
}: {
    customer: Customer
    postStatusCounts: Record<PostStatus, number>
}) {
    const details = [
        { id: 'email', label: 'Email', value: customer.email },
        { id: 'phone', label: 'Telefon', value: customer.phone ?? '-' },
        { id: 'company', label: 'Firma', value: customer.company ?? '-' },
        { id: 'createdAt', label: 'Kayıt Tarihi', value: formatDate(customer.createdAt) },
        { id: 'updatedAt', label: 'Son Güncelleme', value: formatDate(customer.updatedAt) },
    ]
    const stats = [
        { id: 'notes', label: 'Not', value: customer._count?.notes ?? 0 },
        { id: 'posts', label: 'İçerik', value: customer._count?.posts ?? 0 },
    ]

    return (
        <div className='grid gap-4 lg:grid-cols-3'>
            <Card className='lg:col-span-1'>
                <CardHeader>
                    <CardTitle>Müşteri Bilgileri</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className='grid gap-3 text-sm'>
                        {details.map((detail) => (
                            <div key={detail.id} className='grid gap-0.5'>
                                <dt className='text-muted-foreground'>{detail.label}</dt>
                                <dd className='break-all'>{detail.value}</dd>
                            </div>
                        ))}
                    </dl>
                </CardContent>
            </Card>

            <div className='grid content-start gap-4 sm:grid-cols-2 lg:col-span-2'>
                {stats.map((stat) => (
                    <Card key={stat.id}>
                        <CardHeader>
                            <CardDescription>Toplam {stat.label}</CardDescription>
                            <CardTitle className='text-3xl'>{stat.value}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}

                <Card className='sm:col-span-2'>
                    <CardHeader>
                        <CardTitle>İçerik Durumları</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PostStatusChart customerId={customer.id} postStatusCounts={postStatusCounts} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    }
}
