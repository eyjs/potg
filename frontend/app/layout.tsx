import type React from "react"
import type { Metadata, Viewport } from "next"
import { Exo_2 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "JoonBi HQ - 오버워치 내전 관리",
  description: "오버워치 소모임 커뮤니티 플랫폼 - 내전 투표, 팀장 경매, 유틸리티",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#F99E1A",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${exo2.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
