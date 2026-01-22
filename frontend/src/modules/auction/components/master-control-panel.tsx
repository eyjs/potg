"use client"

import { useState } from "react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import { Input } from "@/common/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import {
  Play,
  Pause,
  SkipForward,
  Check,
  X,
  Timer,
  TimerOff,
  Undo2,
  Users,
  Calendar,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AuctionRoomState, AuctionStatus, BiddingPhase } from "../hooks/use-auction-socket"

interface MasterControlPanelProps {
  roomState: AuctionRoomState
  timer: number
  onStartAuction: () => void
  onPauseAuction: () => void
  onResumeAuction: () => void
  onCompleteAuction: () => void
  onPauseTimer: () => void
  onResumeTimer: () => void
  onConfirmBid: () => void
  onPassPlayer: () => void
  onNextPlayer: () => void
  onEnterAssignmentPhase: () => void
  onCreateScrim: (date: Date) => void
}

export function MasterControlPanel({
  roomState,
  timer,
  onStartAuction,
  onPauseAuction,
  onResumeAuction,
  onCompleteAuction,
  onPauseTimer,
  onResumeTimer,
  onConfirmBid,
  onPassPlayer,
  onNextPlayer,
  onEnterAssignmentPhase,
  onCreateScrim,
}: MasterControlPanelProps) {
  const [scrimDate, setScrimDate] = useState("")
  const [scrimTime, setScrimTime] = useState("")
  const [showScrimDialog, setShowScrimDialog] = useState(false)

  const { auction, currentBid, currentPlayer, unsoldPlayers } = roomState
  const status = auction.status
  const biddingPhase = auction.biddingPhase
  const timerPaused = auction.timerPaused

  const handleCreateScrim = () => {
    if (!scrimDate || !scrimTime) return
    const date = new Date(`${scrimDate}T${scrimTime}`)
    onCreateScrim(date)
    setShowScrimDialog(false)
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-wide text-destructive flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            마스터 컨트롤
          </h3>
          <Badge
            className={cn(
              "text-xs",
              status === "ONGOING" ? "bg-green-500" :
              status === "PAUSED" ? "bg-yellow-500" :
              status === "ASSIGNING" ? "bg-blue-500" :
              status === "COMPLETED" ? "bg-primary" : "bg-muted"
            )}
          >
            {status === "ONGOING" ? "진행중" :
             status === "PAUSED" ? "일시정지" :
             status === "ASSIGNING" ? "수동배정" :
             status === "COMPLETED" ? "완료" : "대기"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auction Control */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase">경매 제어</p>
          <div className="grid grid-cols-2 gap-2">
            {status === "PENDING" && (
              <Button
                size="sm"
                className="col-span-2 bg-green-500 hover:bg-green-600 text-white font-bold"
                onClick={onStartAuction}
              >
                <Play className="w-4 h-4 mr-2" />
                경매 시작
              </Button>
            )}

            {status === "ONGOING" && (
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                onClick={onPauseAuction}
              >
                <Pause className="w-4 h-4 mr-2" />
                일시정지
              </Button>
            )}

            {status === "PAUSED" && (
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={onResumeAuction}
              >
                <Play className="w-4 h-4 mr-2" />
                재개
              </Button>
            )}

            {(status === "ONGOING" || status === "PAUSED") && unsoldPlayers.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                onClick={onEnterAssignmentPhase}
              >
                <Users className="w-4 h-4 mr-2" />
                수동배정 단계
              </Button>
            )}

            {(status === "ONGOING" || status === "ASSIGNING") && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={onCompleteAuction}
              >
                경매 종료
              </Button>
            )}
          </div>
        </div>

        {/* Timer Control */}
        {status === "ONGOING" && currentPlayer && biddingPhase === "BIDDING" && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">타이머 제어</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-2xl font-black",
                    timer > 10 ? "text-primary" : timer > 5 ? "text-yellow-500" : "text-destructive"
                  )}
                >
                  {timer}초
                </span>
                {timerPaused && (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    일시정지
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={timerPaused ? onResumeTimer : onPauseTimer}
              >
                {timerPaused ? (
                  <>
                    <Timer className="w-4 h-4 mr-2" />
                    타이머 재개
                  </>
                ) : (
                  <>
                    <TimerOff className="w-4 h-4 mr-2" />
                    타이머 정지
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Bidding Control */}
        {status === "ONGOING" && currentPlayer && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">입찰 제어</p>

            {biddingPhase === "BIDDING" && (
              <div className="grid grid-cols-2 gap-2">
                {currentBid ? (
                  <>
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white font-bold"
                      onClick={onConfirmBid}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      낙찰 확정
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onPassPlayer}
                    >
                      <X className="w-4 h-4 mr-2" />
                      유찰
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="col-span-2"
                    onClick={onPassPlayer}
                  >
                    <X className="w-4 h-4 mr-2" />
                    유찰 처리
                  </Button>
                )}
              </div>
            )}

            {biddingPhase === "SOLD" && (
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                onClick={onNextPlayer}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                다음 매물로 진행
              </Button>
            )}
          </div>
        )}

        {/* Assignment Phase Info */}
        {status === "ASSIGNING" && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
            <p className="text-sm text-blue-400 font-semibold">
              수동 배정 단계입니다. 유찰된 선수를 팀에 드래그하여 배정하세요.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              유찰 선수: {unsoldPlayers.length}명
            </p>
          </div>
        )}

        {/* Completed - Create Scrim */}
        {status === "COMPLETED" && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase">스크림 생성</p>
            <Dialog open={showScrimDialog} onOpenChange={setShowScrimDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                  <Calendar className="w-4 h-4 mr-2" />
                  스크림 일정 설정
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-bold uppercase">스크림 일정 설정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground">날짜</label>
                    <Input
                      type="date"
                      value={scrimDate}
                      onChange={(e) => setScrimDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-muted-foreground">시간</label>
                    <Input
                      type="time"
                      value={scrimTime}
                      onChange={(e) => setScrimTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={handleCreateScrim}
                    disabled={!scrimDate || !scrimTime}
                  >
                    스크림 생성
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
