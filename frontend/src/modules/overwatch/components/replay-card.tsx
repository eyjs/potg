'use client'

import { Copy, ExternalLink, Heart, Eye, MessageCircle, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Button } from '@/common/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Replay } from '../types'
import { RESULT_LABELS, RESULT_COLORS } from '../types'

interface ReplayCardProps {
  replay: Replay
  isOwner?: boolean
  onDelete?: () => void
  onLike?: () => void
}

export function ReplayCard({ replay, isOwner, onDelete, onLike }: ReplayCardProps) {
  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(replay.code)
    toast.success('코드가 복사되었습니다!')
  }

  const resultStyle = RESULT_COLORS[replay.result]
  const resultLabel = RESULT_LABELS[replay.result]

  return (
    <Card className="overflow-hidden border-border/50 bg-card hover:border-border transition-colors">
      <CardContent className="p-0">
        {/* Main Content */}
        <div className="flex gap-4 p-4">
          {/* Map Info */}
          <div className="shrink-0 w-24">
            <p className="font-bold text-sm text-foreground">{replay.mapName}</p>
            {replay.gamemode && (
              <p className="text-xs text-muted-foreground">{replay.gamemode}</p>
            )}
          </div>

          {/* Replay Code */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <code className="px-3 py-1.5 rounded bg-primary/10 border border-primary/30 font-mono font-bold text-primary text-lg tracking-wider">
                {replay.code}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={handleCopyCode}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* User & Date */}
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-2 justify-end">
              <Avatar className="w-6 h-6">
                <AvatarImage src={replay.user?.avatarUrl} />
                <AvatarFallback className="text-xs bg-muted">
                  {replay.user?.battleTag?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{replay.user?.battleTag || '알 수 없음'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(replay.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>

        {/* Heroes & Result */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/10 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">영웅:</span>
            <div className="flex gap-1">
              {replay.heroes.slice(0, 3).map((hero) => (
                <Badge key={hero} variant="outline" className="text-xs border-border/50">
                  {hero}
                </Badge>
              ))}
              {replay.heroes.length > 3 && (
                <Badge variant="outline" className="text-xs border-border/50">
                  +{replay.heroes.length - 3}
                </Badge>
              )}
            </div>
          </div>

          <Badge className={cn('font-bold', resultStyle)}>
            {resultLabel}
          </Badge>
        </div>

        {/* Notes & Tags */}
        {(replay.notes || (replay.tags && replay.tags.length > 0)) && (
          <div className="px-4 py-3 border-t border-border/30">
            {replay.notes && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {replay.notes}
              </p>
            )}
            {replay.tags && replay.tags.length > 0 && (
              <div className="flex gap-1.5">
                {replay.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs border-ow-blue/30 text-ow-blue"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/5 border-t border-border/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button
              className="flex items-center gap-1 hover:text-red-400 transition-colors"
              onClick={onLike}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>{replay.likes}</span>
            </button>
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{replay.views}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {replay.videoUrl && (
              <a
                href={replay.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ow-blue hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                영상 보기
              </a>
            )}
            {isOwner && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
