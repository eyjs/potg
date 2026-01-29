'use client'

import { RefreshCw, Shield, Lock, Unlock } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OverwatchProfile } from '../types'

interface ProfileHeaderProps {
  profile: OverwatchProfile
  isMe?: boolean
  isSyncing?: boolean
  onSync?: () => void
}

export function ProfileHeader({
  profile,
  isMe = false,
  isSyncing = false,
  onSync,
}: ProfileHeaderProps) {
  const lastSyncTime = profile.lastSyncedAt
    ? formatRelativeTime(new Date(profile.lastSyncedAt))
    : '동기화 안됨'

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
      {/* Namecard Background */}
      <div
        className="h-32 md:h-40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
        style={
          profile.namecard
            ? { backgroundImage: `url(${profile.namecard})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="relative px-4 pb-4 -mt-12 md:-mt-16">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-primary/50 shadow-lg shadow-primary/20">
              <AvatarImage src={profile.avatar} alt={profile.battleTag} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {profile.battleTag.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Endorsement Badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground border-2 border-card">
              {profile.endorsementLevel}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-foreground">
                {profile.battleTag}
              </h1>
              {isMe && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  나
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  profile.privacy === 'public'
                    ? 'border-green-500/30 text-green-500'
                    : 'border-red-500/30 text-red-500'
                )}
              >
                {profile.privacy === 'public' ? (
                  <>
                    <Unlock className="w-3 h-3 mr-1" />
                    공개
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    비공개
                  </>
                )}
              </Badge>
            </div>

            {profile.title && (
              <p className="text-sm text-muted-foreground italic">{profile.title}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>{profile.platform.toUpperCase()}</span>
              <span>·</span>
              <span>마지막 동기화: {lastSyncTime}</span>
              {profile.lastSyncStatus === 'error' && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  오류
                </Badge>
              )}
            </div>
          </div>

          {/* Sync Button */}
          {isMe && onSync && (
            <Button
              onClick={onSync}
              disabled={isSyncing}
              className="w-full sm:w-auto skew-x-[-8deg] bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wide text-sm"
            >
              <span className="skew-x-[8deg] flex items-center justify-center gap-2">
                <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                {isSyncing ? '동기화 중...' : '동기화'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString('ko-KR')
}
