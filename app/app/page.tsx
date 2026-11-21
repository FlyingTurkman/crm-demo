import type { Metadata } from 'next'
import AppPageClient from "./page.client";

export const metadata: Metadata = {
    title: 'Ana Sayfa',
}

export default function Page() {

    return (
        <AppPageClient/>
    )
}