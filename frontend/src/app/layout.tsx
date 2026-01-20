import type React from "react"
import type { Metadata, Viewport } from "next"
import { Exo_2 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"

import { BottomNav } from "@/common/layouts/bottom-nav"

const exo2 = Exo_2({
// ...
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${exo2.className} antialiased pb-16 md:pb-0`}>
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
