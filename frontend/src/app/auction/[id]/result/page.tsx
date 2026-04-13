import type { Metadata } from "next"
import { AuctionResultPage } from "./auction-result-page"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://potg.joonbi.co.kr"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const response = await fetch(`${API_URL}/auctions/${id}`, {
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return {
        title: "내전 결과 | POTG",
        description: "POTG 내전 결과를 확인하세요",
      }
    }

    const auction = await response.json()
    const title = `${auction.title || "경매"} - 내전 결과`
    const description = `${auction.title || "경매"} 내전 결과를 확인하세요`

    return {
      title: `${title} | POTG`,
      description,
      openGraph: {
        title,
        description,
        type: "article",
      },
    }
  } catch {
    return {
      title: "내전 결과 | POTG",
      description: "POTG 내전 결과를 확인하세요",
    }
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return <AuctionResultPage auctionId={id} />
}
