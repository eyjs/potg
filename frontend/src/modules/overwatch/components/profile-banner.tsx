"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { handleApiError } from "@/lib/api-error"
import { cn } from "@/lib/utils"
import type { OverwatchProfile } from "../types"

interface ProfileBannerProps {
  battleTag: string
  avatar?: string
  profile?: OverwatchProfile | null
  onSync?: () => void
  isLoading?: boolean
  className?: string
}

export function ProfileBanner({
  battleTag,
  avatar,
  profile,
  onSync,
  isLoading,
  className,
}: ProfileBannerProps) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.post("/overwatch/profile/me/sync")
      toast.success("프로필이 동기화되었습니다!")
      onSync?.()
    } catch (error) {
      handleApiError(error, "동기화 실패")
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return "동기화 안됨"
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}일 전`
    if (hours > 0) return `${hours}시간 전`
    if (minutes > 0) return `${minutes}분 전`
    return "방금 전"
  }

  // 프로필이 로딩 중일 때
  if (isLoading) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-lg bg-card border border-border",
        className
      )}>
        <div className="h-32 md:h-40 bg-gradient-to-r from-muted/30 to-muted/10 animate-pulse" />
        <div className="absolute inset-0 flex items-center px-6">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted/50 animate-pulse" />
          <div className="ml-4 flex-1 space-y-2">
            <div className="h-6 w-40 bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const displayAvatar = profile?.avatar || avatar
  const displayTitle = profile?.title
  const endorsementLevel = profile?.endorsementLevel || 0

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border border-border",
      className
    )}>
      {/* Namecard 배경 */}
      <div
        className="h-32 md:h-40 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20"
        style={profile?.namecard ? {
          backgroundImage: `url(${profile.namecard})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : undefined}
      >
        {/* 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/60 to-transparent" />
      </div>

      {/* 콘텐츠 */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-4 pb-4 md:px-6 md:pb-6 flex items-end justify-between gap-4">
          {/* 왼쪽: 아바타 + 정보 */}
          <div className="flex items-end gap-4">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-[#0B0B0B] shadow-2xl ring-2 ring-primary/30">
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-black">
                {battleTag?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="pb-1">
              <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-foreground">
                {battleTag}
              </h1>

              <div className="flex items-center gap-2 mt-1">
                {displayTitle && (
                  <span className="text-xs md:text-sm text-primary font-medium">
                    {displayTitle}
                  </span>
                )}
                {endorsementLevel > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] md:text-xs border-primary/30 text-primary"
                  >
                    추천 Lv.{endorsementLevel}
                  </Badge>
                )}
              </div>

              {profile?.lastSyncedAt && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  마지막 동기화: {formatLastSync(profile.lastSyncedAt)}
                </p>
              )}
            </div>
          </div>

          {/* 오른쪽: 동기화 버튼 + 상태 */}
          <div className="flex flex-col items-end gap-2">
            {/* 동기화 상태 배지 */}
            {profile && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  profile.lastSyncStatus === "success" && "bg-green-500/10 text-green-500 border-green-500/30",
                  profile.lastSyncStatus === "error" && "bg-red-500/10 text-red-500 border-red-500/30",
                  profile.lastSyncStatus === "not_found" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
                  !profile.lastSyncStatus && "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                {profile.lastSyncStatus === "success" && (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    연동됨
                  </>
                )}
                {profile.lastSyncStatus === "error" && (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    오류
                  </>
                )}
                {profile.lastSyncStatus === "not_found" && (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    프로필 비공개
                  </>
                )}
              </Badge>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
              className="font-bold border-primary/30 text-primary hover:bg-primary/10"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {profile ? "새로고침" : "연동하기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
