import type React from "react"
import type { Metadata, Viewport } from "next"
import { Exo_2 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"
import { QueryProvider } from "@/providers/query-provider"
import { MotionProvider } from "@/providers/motion-provider"
import { Toaster } from "sonner"

import { BottomNav } from "@/common/layouts/bottom-nav"

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
})

export const metadata: Metadata = {
  title: "POTG Auction",
  description: "Overwatch Clan Auction System",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${exo2.className} antialiased pb-16 md:pb-0`}>
        <QueryProvider>
          <AuthProvider>
            <MotionProvider>
              {children}
            </MotionProvider>
            <BottomNav />
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  )
}