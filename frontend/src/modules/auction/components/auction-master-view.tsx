'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Skeleton } from '@/common/components/ui/skeleton'
import { Settings2, Gavel, Trophy, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuctionPendingMaster } from './auction-pending-master'
import { AuctionOngoingMaster } from './auction-ongoing-master'
import { AuctionCompleted } from './auction-completed'
import { TeamRosters } from './parts/team-rosters'
import type { RoomState, AuctionStatus } from '../types'
import type { AuctionEmitFns } from '../hooks/use-auction-socket'

type MasterTab = 'manage' | 'live' | 'result'

interface Props {
  auctionId: string
  fallbackStatus: AuctionStatus
  roomState: RoomState | null
  timerRemaining: number | null
  emit: AuctionEmitFns
}

/** 상태별 기본 탭 — 준비 중엔 관리, 진행 중엔 경매장, 배정/완료 땐 결과. */
function defaultTabFor(status: AuctionStatus): MasterTab {
  if (status === 'PENDING') return 'manage'
  if (status === 'ONGOING' || status === 'PAUSED') return 'live'
  return 'result'
}

const TABS: Array<{ key: MasterTab; label: string; icon: typeof Settings2 }> = [
  { key: 'manage', label: '경매 관리', icon: Settings2 },
  { key: 'live', label: '경매장', icon: Gavel },
  { key: 'result', label: '결과', icon: Trophy },
]

/**
 * 마스터 전용 3화면 컨테이너.
 *
 * 경매 관리(팀장/매물 구성) ↔ 경매장(진행 컨트롤) ↔ 결과(유찰 배정·리포트·포스터)를
 * 탭으로 자유롭게 오간다. 같은 페이지 내 전환이라 socket 연결·roomState 가 유지되어
 * 진행 중에도 관리 화면을 보고 돌아올 수 있다. 경매 status 가 바뀌면 그 상태의
 * 기본 탭으로 자동 전환된다 (시작 → 경매장, 배정/완료 → 결과).
 */
export function AuctionMasterView({
  auctionId,
  fallbackStatus,
  roomState,
  timerRemaining,
  emit,
}: Props) {
  const status = roomState?.auction.status ?? fallbackStatus
  const [tab, setTab] = useState<MasterTab>(() => defaultTabFor(status))
  const [prevStatus, setPrevStatus] = useState(status)

  // status 전이 시 해당 상태의 기본 탭으로 자동 전환 (렌더 중 상태 보정 패턴)
  if (prevStatus !== status) {
    setPrevStatus(status)
    setTab(defaultTabFor(status))
  }

  return (
    <div className="space-y-4">
      {/* 탭 내비게이션 */}
      <nav
        aria-label="경매 화면 전환"
        className="flex items-center gap-1 border-b border-border"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wider',
              'border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'live' && (status === 'ONGOING' || status === 'PAUSED') && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-ow-red animate-pulse"
                aria-label="진행 중"
              />
            )}
          </button>
        ))}
      </nav>

      {tab === 'manage' && (
        <AuctionPendingMaster
          auctionId={auctionId}
          roomState={roomState}
          emit={emit}
          readOnly={status !== 'PENDING'}
        />
      )}

      {tab === 'live' && <LiveTab {...{ status, roomState, timerRemaining, emit }} onGoManage={() => setTab('manage')} />}

      {tab === 'result' && (
        <ResultTab status={status} roomState={roomState} timerRemaining={timerRemaining} emit={emit} />
      )}
    </div>
  )
}

function LiveTab({
  status,
  roomState,
  timerRemaining,
  emit,
  onGoManage,
}: {
  status: AuctionStatus
  roomState: RoomState | null
  timerRemaining: number | null
  emit: AuctionEmitFns
  onGoManage: () => void
}) {
  if (status === 'PENDING') {
    return (
      <Card className="bg-card border-dashed border-border">
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <Gavel className="w-10 h-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-bold">아직 경매가 시작되지 않았습니다</p>
            <p className="text-xs text-muted-foreground">
              경매 관리 탭에서 팀장·매물을 구성한 뒤 경매를 시작하세요.
            </p>
          </div>
          <Button
            onClick={onGoManage}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <Play className="w-4 h-4 mr-2" />
            경매 관리로 이동
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (!roomState) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return (
      <Card className="bg-card border-dashed border-border">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          경매가 종료되었습니다. 결과 탭에서 팀 구성과 포스터를 확인하세요.
        </CardContent>
      </Card>
    )
  }
  return (
    <AuctionOngoingMaster
      roomState={roomState}
      timerRemaining={timerRemaining}
      emit={emit}
    />
  )
}

function ResultTab({
  status,
  roomState,
  timerRemaining,
  emit,
}: {
  status: AuctionStatus
  roomState: RoomState | null
  timerRemaining: number | null
  emit: AuctionEmitFns
}) {
  if (!roomState) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // 완료 — 최종 리포트 + 공유 포스터 다운로드
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return <AuctionCompleted roomState={roomState} canRestart />
  }

  // 유찰자 배정 — 드래그앤드롭 배정 화면 (기존 마스터 화면의 ASSIGNING 브랜치)
  if (status === 'ASSIGNING') {
    return (
      <AuctionOngoingMaster
        roomState={roomState}
        timerRemaining={timerRemaining}
        emit={emit}
      />
    )
  }

  // 진행 중/준비 중 — 중간 현황 리포트 (실시간)
  const unassigned = roomState.unsoldPlayers
  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardContent className="py-3 text-xs text-muted-foreground">
          경매 진행 중 중간 현황입니다. 낙찰이 확정될 때마다 실시간으로
          갱신됩니다. 최종 리포트와 공유 포스터는 경매 종료 후 이 탭에서
          제공됩니다.
        </CardContent>
      </Card>
      <TeamRosters teams={roomState.teams} showPrice />
      {unassigned.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase">
              미배정 매물 ({unassigned.length})
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {unassigned.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    'bg-muted/20 rounded px-2 py-1 truncate',
                    p.wasUnsold && 'text-ow-red',
                  )}
                >
                  {p.name}
                  {p.wasUnsold && ' (유찰)'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
