'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toPng } from 'html-to-image'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Plus, Download, Trash2, X } from 'lucide-react'
import { useConfirm } from '@/common/components/confirm-dialog'
import { handleApiError } from '@/lib/api-error'
import { auctionsApi } from '../api/auctions'
import { useHeroes } from '../hooks/use-heroes'
import { AuctionResultPoster } from './parts/auction-result-poster'
import { CreateAuctionDialog } from './parts/create-auction-dialog'
import type { RoomState } from '../types'

interface Props {
  roomState: RoomState
  canRestart: boolean
}

const HELP_DISMISS_KEY = 'auction-completed-help-seen'

export function AuctionCompleted({ roomState, canRestart }: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [helpDismissed, setHelpDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(HELP_DISMISS_KEY) === '1'
  })
  const posterRef = useRef<HTMLDivElement>(null)
  const { portraitByKey } = useHeroes()

  const handleDismissHelp = () => {
    window.localStorage.setItem(HELP_DISMISS_KEY, '1')
    setHelpDismissed(true)
  }

  const handleDiscard = async () => {
    const ok = await confirm({
      title: '결과를 버리시겠습니까?',
      description:
        '이 경매의 모든 결과(팀 구성·낙찰가·미낙찰 명단)가 DB 에서 영구 삭제됩니다. 이력에 남지 않습니다. 결과 이미지를 미리 다운로드했는지 확인하세요.',
      variant: 'destructive',
      confirmText: '버리기 (영구 삭제)',
    })
    if (!ok) return
    setIsDiscarding(true)
    try {
      await auctionsApi.delete(roomState.auction.id)
      await queryClient.invalidateQueries({ queryKey: ['auction', 'current'] })
      toast.success('결과를 버렸습니다.')
    } catch (error) {
      handleApiError(error, '결과 삭제 실패')
    } finally {
      setIsDiscarding(false)
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

  return (
    <div className="space-y-4">
      {/* 상단 액션 바 — 결과 화면(=이미지) 위 컴팩트 컨트롤. 이미지 저장은 부수 기능. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          variant="outline"
          className="border-ow-blue text-ow-blue hover:bg-ow-blue/10 disabled:opacity-40"
        >
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? '생성 중...' : '이미지로 저장'}
        </Button>
        {canRestart && (
          <>
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={isDiscarding}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 disabled:opacity-40"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 경매 (이력 저장)
            </Button>
            <Button
              onClick={handleDiscard}
              disabled={isDiscarding}
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              결과 버리기
            </Button>
          </>
        )}
      </div>

      {/* 안내 — 마스터에게 보존/버리기 의미 명시. 한 번 닫으면 localStorage 에 기억. */}
      {canRestart && !helpDismissed && (
        <Card className="bg-card border-dashed border-border">
          <CardContent className="py-3 text-xs text-muted-foreground flex items-start gap-3">
            <div className="space-y-1 flex-1">
              <p>
                <span className="text-primary font-bold">새 경매 (이력 저장)</span> —
                이번 결과는 DB 에 보존되어 향후 포인트 지급/이력 조회에 사용됩니다.
              </p>
              <p>
                <span className="text-destructive font-bold">결과 버리기</span> —
                테스트성 경매나 잘못된 결과는 영구 삭제하여 쓰레기 데이터 누적을 방지합니다.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismissHelp}
              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="안내 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 결과 화면 = 공유 이미지 그 자체. 이 노드가 곧 다운로드 대상(posterRef).
          작은 화면에서는 가로 스크롤로 1080px 포스터를 그대로 보여준다. */}
      <div className="overflow-x-auto rounded-lg border border-primary/20 shadow-[0_0_40px_rgba(249,158,26,0.08)]">
        <div className="mx-auto w-fit">
          <AuctionResultPoster
            ref={posterRef}
            title={roomState.auction.title}
            teams={roomState.teams}
            unsoldPlayers={unsold}
            startingPoints={roomState.auction.startingPoints}
            heroPortraits={portraitByKey}
          />
        </div>
      </div>

      <CreateAuctionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
