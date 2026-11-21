import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SiteProvider } from '@/components/app/context/SiteContext'
import { getCurrentUser } from '@/lib/auth/session'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pages only set their own title, it is shown as '<title> | CRM'
export const metadata: Metadata = {
  title: {
    default: 'CRM',
    template: '%s | CRM',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser()

  return (
    <html lang='tr'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* DTO classes are spread into plain objects before reaching client components */}
        <SiteProvider initialUser={user ? { ...user } : null}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster richColors position='top-center' />
        </SiteProvider>
      </body>
    </html>
  );
}
