'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/common/components/ui/button';
import { Badge } from '@/common/components/ui/badge';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Pin,
  Lock,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu';
import type { Post, PostType, PostVisibility } from '../types';

interface PostCardProps {
  post: Post;
  isOwner: boolean;
  isLiked?: boolean;
  onLike?: () => void;
  onUnlike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
}

const POST_TYPE_BADGE: Record<PostType, { label: string; color: string }> = {
  TEXT: { label: '', color: '' },
  IMAGE: { label: '📷 사진', color: 'bg-blue-500/20 text-blue-400' },
  CLIP: { label: '🎬 클립', color: 'bg-purple-500/20 text-purple-400' },
  SCRIM_RESULT: { label: '⚔️ 스크림', color: 'bg-red-500/20 text-red-400' },
  ACHIEVEMENT: { label: '🏆 업적', color: 'bg-yellow-500/20 text-yellow-400' },
  GAME_RESULT: { label: '🎮 게임', color: 'bg-green-500/20 text-green-400' },
  BALANCE_GAME: { label: '⚖️ 밸런스', color: 'bg-pink-500/20 text-pink-400' },
};

const VISIBILITY_ICON: Record<PostVisibility, React.ReactNode> = {
  PUBLIC: null,
  FOLLOWERS: <Users className="w-3 h-3" />,
  PRIVATE: <Lock className="w-3 h-3" />,
};

export function PostCard({
  post,
  isOwner,
  isLiked,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onPin,
}: PostCardProps) {
  const [showFullContent, setShowFullContent] = useState(false);

  const typeBadge = POST_TYPE_BADGE[post.type];
  const shouldTruncate = post.content && post.content.length > 300;
  const displayContent = shouldTruncate && !showFullContent
    ? post.content?.slice(0, 300) + '...'
    : post.content;

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* 아바타 */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-zinc-700">
            {post.author?.user?.avatarUrl ? (
              <Image
                src={post.author.user.avatarUrl}
                alt={post.author.user.battleTag}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {post.author?.user?.battleTag?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                {post.author?.user?.battleTag}
              </span>
              {post.isPinned && (
                <Pin className="w-3 h-3 text-orange-500" />
              )}
              {VISIBILITY_ICON[post.visibility]}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
              {typeBadge.label && (
                <Badge className={`text-xs ${typeBadge.color}`}>
                  {typeBadge.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPin}>
                <Pin className="w-4 h-4 mr-2" />
                {post.isPinned ? '고정 해제' : '프로필에 고정'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                수정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-500">
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 본문 */}
      {displayContent && (
        <div className="mb-3">
          <p className="text-zinc-200 whitespace-pre-wrap">{displayContent}</p>
          {shouldTruncate && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-orange-500 text-sm hover:underline mt-1"
            >
              {showFullContent ? '접기' : '더 보기'}
            </button>
          )}
        </div>
      )}

      {/* 미디어 */}
      {post.media && post.media.length > 0 && (
        <div className={`grid gap-2 mb-3 ${
          post.media.length === 1 ? 'grid-cols-1' :
          post.media.length === 2 ? 'grid-cols-2' :
          post.media.length === 3 ? 'grid-cols-3' :
          'grid-cols-2'
        }`}>
          {post.media.slice(0, 4).map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800"
            >
              <Image
                src={url}
                alt={`미디어 ${idx + 1}`}
                fill
                className="object-cover hover:scale-105 transition-transform cursor-pointer"
              />
              {post.media && idx === 3 && post.media.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    +{post.media.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1 pt-2 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={isLiked ? onUnlike : onLike}
          className={isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-red-500'}
        >
          <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
          {post.likeCount > 0 && post.likeCount}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onComment}
          className="text-zinc-400 hover:text-blue-500"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          {post.commentCount > 0 && post.commentCount}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          className="text-zinc-400 hover:text-green-500"
        >
          <Share2 className="w-4 h-4 mr-1" />
          {post.shareCount > 0 && post.shareCount}
        </Button>
      </div>
    </div>
  );
}
