"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import type { PostComment } from "../types"

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

interface CommentListProps {
  comments: PostComment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        아직 댓글이 없습니다. 첫 댓글을 작성해보세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const displayName =
          comment.author?.user?.nickname ||
          comment.author?.user?.battleTag?.split("#")[0] ||
          "익명";

        return (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={comment.author?.user?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">{displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground/90 break-words">
                {comment.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
