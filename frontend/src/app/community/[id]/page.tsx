import type { Metadata } from "next"
import { CommunityPostPage } from "./community-post-page"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://potg.joonbi.co.kr"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const response = await fetch(`${API_URL}/posts/community/${id}`, {
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return {
        title: "POTG 커뮤니티",
        description: "POTG 커뮤니티 게시글",
      }
    }

    const post = await response.json()
    const title = post.title || "POTG 커뮤니티"
    const description = post.content?.slice(0, 100) || "POTG 커뮤니티 게시글을 확인하세요"
    const firstImage = post.media?.[0]

    return {
      title: `${title} | POTG`,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        ...(firstImage ? { images: [{ url: firstImage }] } : {}),
      },
    }
  } catch {
    return {
      title: "POTG 커뮤니티",
      description: "POTG 커뮤니티 게시글",
    }
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return <CommunityPostPage postId={id} />
}
