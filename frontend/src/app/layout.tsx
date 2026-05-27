import type React from "react"
import type { Metadata, Viewport } from "next"
import { Exo_2 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"
import { QueryProvider } from "@/providers/query-provider"
import { MotionProvider } from "@/providers/motion-provider"
import { ConfirmProvider } from "@/common/components/confirm-dialog"
import { Toaster } from "sonner"

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
      <body className={`${exo2.className} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <ConfirmProvider>
              <MotionProvider>
                {children}
              </MotionProvider>
              <Toaster position="top-center" richColors />
            </ConfirmProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  )
}