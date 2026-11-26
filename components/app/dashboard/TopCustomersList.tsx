import Link from 'next/link'
import type { Customer } from '@/types'

// Ranked bars (one hue, longest first): customers with the most blogs
export default function TopCustomersList({ items }: { items: { customer: Customer, postCount: number }[] }) {
    const max = Math.max(1, ...items.map((item) => item.postCount))

    if (items.length === 0) {
        return (
            <p className='py-8 text-center text-sm text-muted-foreground'>Henüz içerik yok</p>
        )
    }

    return (
        <ul className='flex flex-col gap-1'>
            {items.map((item) => (
                <li key={item.customer.id}>
                    <Link
                        href={`/app/customers/${item.customer.id}/blogs`}
                        className='grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted'
                    >
                        <span className='truncate'>{item.customer.fullName}</span>
                        <span className='h-2 rounded-full bg-muted'>
                            <span
                                className='block h-2 rounded-full bg-primary'
                                style={{ width: `${(item.postCount / max) * 100}%` }}
                            />
                        </span>
                        <span className='text-right font-medium tabular-nums'>{item.postCount}</span>
                    </Link>
                </li>
            ))}
        </ul>
    )
}
