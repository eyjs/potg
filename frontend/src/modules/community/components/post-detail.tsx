"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { usePublicPost, useComments, useCreateComment, useLikePost, useUnlikePost } from "../hooks/use-community"
import { CommentList } from "./comment-list"
import { CommentInput } from "./comment-input"
import { ShareButton } from "./share-button"
import { toast } from "sonner"

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const { user } = useAuth();
  const { data: post, isLoading: isPostLoading } = usePublicPost(postId);
  const { data: commentsData } = useComments(postId);
  const createComment = useCreateComment(postId, user?.clanId);
  const likePost = useLikePost(user?.clanId);
  const unlikePost = useUnlikePost(user?.clanId);

  const [isLiked, setIsLiked] = useState(false);

  if (isPostLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-6 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        게시물을 찾을 수 없습니다.
      </div>
    );
  }

  const displayName =
    post.author?.user?.nickname ||
    post.author?.user?.battleTag?.split("#")[0] ||
    "익명";

  const handleLike = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    try {
      if (isLiked) {
        await unlikePost.mutateAsync(postId);
        setIsLiked(false);
      } else {
        await likePost.mutateAsync(postId);
        setIsLiked(true);
      }
    } catch {
      toast.error("좋아요 처리에 실패했습니다");
    }
  };

  const handleComment = async (content: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    try {
      await createComment.mutateAsync({ content });
    } catch {
      toast.error("댓글 작성에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6">
      {/* Post Header */}
      <div>
        {post.title && (
          <h1 className="text-xl font-black mb-3">{post.title}</h1>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author?.user?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">
              {displayName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Post Content */}
      {post.content && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
      )}

      {/* Images */}
      {post.media && post.media.length > 0 && (
        <div className={cn(
          "grid gap-2",
          post.media.length === 1 && "grid-cols-1",
          post.media.length === 2 && "grid-cols-2",
          post.media.length >= 3 && "grid-cols-2",
        )}>
          {post.media.map((url, index) => (
            <div
              key={url}
              className={cn(
                "relative rounded-lg overflow-hidden bg-muted",
                post.media!.length === 1 ? "aspect-video" : "aspect-square",
              )}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 py-3 border-y border-border/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={cn(
            "gap-2",
            isLiked && "text-red-500",
          )}
        >
          <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          <span>{post.likeCount + (isLiked ? 1 : 0)}</span>
        </Button>

        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span>{commentsData?.total ?? post.commentCount}</span>
        </Button>

        <div className="ml-auto">
          <ShareButton />
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
          댓글 {commentsData?.total ?? 0}
        </h3>

        <CommentInput
          onSubmit={handleComment}
          isLoading={createComment.isPending}
          disabled={!user}
        />

        <CommentList comments={commentsData?.data ?? []} />
      </div>
    </div>
  );
}
