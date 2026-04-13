"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart, MessageCircle, Pin } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CommunityPost } from "../types"

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;

  return date.toLocaleDateString("ko-KR");
}

interface PostCardProps {
  post: CommunityPost;
}

export function PostCard({ post }: PostCardProps) {
  const displayName =
    post.author?.user?.nickname ||
    post.author?.user?.battleTag?.split("#")[0] ||
    "익명";
  const firstImage = post.media?.[0];

  return (
    <Link href={`/community/${post.id}`}>
      <article
        className={cn(
          "group p-4 rounded-lg border border-border/50 bg-card/50",
          "hover:border-primary/30 hover:bg-card/80 transition-all",
          post.isPinned && "border-primary/30 bg-primary/5",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {post.isPinned && (
            <Pin className="w-3 h-3 text-primary fill-primary" />
          )}
          <span className="text-xs text-muted-foreground font-medium">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground/50">
            {formatRelativeTime(post.createdAt)}
          </span>
        </div>

        {/* Content */}
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            {post.title && (
              <h3 className="font-bold text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
            )}
            {post.content && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.content}
              </p>
            )}
          </div>

          {/* Thumbnail */}
          {firstImage && (
            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
              <Image
                src={firstImage}
                alt=""
                width={64}
                height={64}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {post.commentCount}
          </span>
        </div>
      </article>
    </Link>
  );
}
