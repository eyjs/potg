'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toPng } from 'html-to-image'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Trophy, RotateCcw, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/common/components/confirm-dialog'
import { handleApiError } from '@/lib/api-error'
import { auctionsApi } from '../api/auctions'
import { TeamRosters } from './parts/team-rosters'
import { AuctionResultPoster } from './parts/auction-result-poster'
import type { RoomState } from '../types'

interface Props {
  roomState: RoomState
  canRestart: boolean
}

export function AuctionCompleted({ roomState, canRestart }: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)

  const handleNewAuction = async () => {
    const ok = await confirm({
      title: '새 경매를 시작하시겠습니까?',
      description:
        '현재 경매 결과(팀 구성·낙찰가·미낙찰 명단)가 DB 에서 삭제됩니다. 결과 이미지를 미리 다운로드했는지 확인하세요.',
      variant: 'destructive',
      confirmText: '결과 삭제 후 새 경매',
    })
    if (!ok) return
    setIsDeleting(true)
    try {
      await auctionsApi.delete(roomState.auction.id)
      await queryClient.invalidateQueries({ queryKey: ['auction', 'current'] })
      toast.success('정리되었습니다. 새 경매를 시작하세요.')
    } catch (error) {
      handleApiError(error, '경매 정리 실패')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = async () => {
    if (!posterRef.current) return
    setIsDownloading(true)
    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0b0b0b',
      })
      const link = document.createElement('a')
      const date = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '')
      const safeTitle = roomState.auction.title.replace(/[^\w가-힣\s-]/g, '_')
      link.download = `${safeTitle}_${date}.png`
      link.href = dataUrl
      link.click()
      toast.success('결과 이미지를 다운로드했습니다.')
    } catch (error) {
      handleApiError(error, '이미지 생성 실패')
    } finally {
      setIsDownloading(false)
    }
  }

  const unsold = roomState.unsoldPlayers
  const totalRecruited = roomState.teams.reduce(
    (sum, t) => sum + t.members.length,
    0,
  )

  return (
    <div className="space-y-6">
      <Card className="bg-card border-primary/30">
        <CardContent className="py-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black italic uppercase tracking-tighter truncate">
              경매 완료 — <span className="text-primary">{roomState.auction.title}</span>
            </h2>
            <p className="text-muted-foreground text-xs">
              팀 {roomState.teams.length}개 · 영입 {totalRecruited}명 · 미낙찰{' '}
              {unsold.length}명
            </p>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className={cn(
              'skew-x-[-10deg] bg-ow-blue px-4 py-2 text-sm font-bold text-black',
              'hover:bg-ow-blue/90 transition-colors',
            )}
          >
            <span className="skew-x-[10deg] flex items-center gap-2">
              <Download className="w-4 h-4" />
              {isDownloading ? '생성 중...' : '결과 이미지'}
            </span>
          </Button>
          {canRestart && (
            <Button
              onClick={handleNewAuction}
              disabled={isDeleting}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />새 경매
            </Button>
          )}
        </CardContent>
      </Card>

      <TeamRosters teams={roomState.teams} showPrice />

      {unsold.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase">
              미낙찰 선수 ({unsold.length})
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {unsold.map((p) => (
                <li
                  key={p.id}
                  className="bg-muted/20 rounded px-2 py-1 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted-foreground uppercase text-[10px]">
                    {p.role}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 캡처 대상 — 사용자에게는 보이지 않지만 모바일에서도 1080px 폭이 잘리지 않도록
          width/min-width 명시 + overflow hidden 으로 viewport 영향 차단. */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 1080,
          minWidth: 1080,
          transform: 'translate(-200%, -200%)',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        aria-hidden
      >
        <AuctionResultPoster
          ref={posterRef}
          title={roomState.auction.title}
          teams={roomState.teams}
          unsoldPlayers={unsold}
          startingPoints={roomState.auction.startingPoints}
        />
      </div>
    </div>
  )
}
