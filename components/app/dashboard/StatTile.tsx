import Link from 'next/link'
import type { IconType } from 'react-icons'
import { IoArrowForward } from 'react-icons/io5'
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

// One headline number. The tile links to its list, the footnote to a quick filter of it.
export default function StatTile({
    label,
    value,
    href,
    icon: Icon,
    note,
    noteHref
}: {
    label: string
    value: number
    href: string
    icon: IconType
    note?: string
    noteHref?: string
}) {
    return (
        <Card className='gap-2'>
            <CardHeader>
                <CardDescription>
                    <Link href={href} className='hover:text-foreground hover:underline'>{label}</Link>
                </CardDescription>
                <CardAction>
                    <Icon className='size-5 text-muted-foreground' aria-hidden />
                </CardAction>
            </CardHeader>
            <CardContent className='flex flex-col gap-1'>
                <Link href={href} className='text-3xl font-semibold hover:underline'>
                    {value.toLocaleString('tr-TR')}
                </Link>
                {note && noteHref && (
                    <Link href={noteHref} className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline'>
                        {note} <IoArrowForward className='size-3' aria-hidden />
                    </Link>
                )}
                {note && !noteHref && (
                    <span className='text-sm text-muted-foreground'>{note}</span>
                )}
            </CardContent>
        </Card>
    )
}
