'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import type { RoomState } from '../types'
import { useAuctionSound } from './use-auction-sound'

const SOCKET_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://potg.joonbi.co.kr'

interface ErrorPayload {
  message?: string
}

export interface AuctionChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: string
  type: 'chat'
}

/** 입찰/낙찰 이벤트 피드 — 게임 킬로그 스타일 표시용 (bidPlaced/bidConfirmed 구독) */
export interface AuctionBidEvent {
  id: string
  kind: 'bid' | 'sold'
  bidderName: string
  amount: number
  timestamp: string
}

/** 무대 연출 트리거 — 낙찰(sold)/유찰(pass) 순간을 seq 증가로 알린다. */
export interface AuctionStageEvent {
  kind: 'sold' | 'pass'
  seq: number
}

export interface AuctionEmitFns {
  placeBid: (targetPlayerId: string, amount: number) => void
  selectPlayer: (playerId: string) => void
  confirmBid: () => void
  passPlayer: () => void
  nextPlayer: () => void
  startAuction: () => void
  completeAuction: () => void
  enterAssignmentPhase: () => void
  manualAssignPlayer: (playerId: string, captainId: string) => void
  /** 낙찰/배정 회수 — 캡틴 포인트 환불 + 선수를 대기 풀로 복귀 (마스터 전용) */
  undoSoldPlayer: (playerId: string) => void
  resetAuction: () => void
  pauseAuction: () => void
  resumeAuction: () => void
  sendChat: (message: string) => void
}

interface UseAuctionSocketReturn {
  isConnected: boolean
  roomState: RoomState | null
  timerRemaining: number | null
  chatMessages: AuctionChatMessage[]
  bidEvents: AuctionBidEvent[]
  stageEvent: AuctionStageEvent | null
  emit: AuctionEmitFns
}

/**
 * /auction namespace 에 연결되어 실시간 경매 상태를 구독한다.
 *
 * 백엔드 gateway: backend/src/modules/auctions/auctions.gateway.ts
 * - 모든 mutation event 는 백엔드에서 roomState 변경 후 broadcast → 클라이언트는 동기화만
 * - 자동 낙찰: backend timer 0 도달 시 currentBid 있으면 자동 confirm, 없으면 auto pass
 * - 'nextPlayer' 만 마스터의 명시적 트리거 (SOLD → WAITING 진행)
 */
export function useAuctionSocket(
  auctionId: string | null,
  userId: string | null,
): UseAuctionSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<AuctionChatMessage[]>([])
  const [bidEvents, setBidEvents] = useState<AuctionBidEvent[]>([])
  const [stageEvent, setStageEvent] = useState<AuctionStageEvent | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!auctionId || !userId) {
      return
    }

    const socket = io(`${SOCKET_BASE}/auction`, {
      withCredentials: true,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    // 'roomState' 직접 응답(joinRoom/requestRoomState)과 broadcast({ roomState })
    // 두 형상을 모두 허용 — 배포 시차(프론트/백엔드)에도 초기 상태 수신이 깨지지 않게.
    const handleRoomState = (payload: { roomState?: RoomState } | RoomState) => {
      const next =
        payload && 'roomState' in payload && payload.roomState
          ? payload.roomState
          : (payload as RoomState)
      if (next && 'auction' in next) setRoomState(next)
    }

    // socket.io-client 가 자동 재연결 시 'connect' 이벤트가 다시 발화하므로
    // joinRoom 도 매 재연결마다 다시 emit 되어 room membership 이 자동 복원된다.
    // 식별자는 백엔드가 HttpOnly 쿠키(access_token)로 검증 — 페이로드로 보내지 않는다.
    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('joinRoom', { auctionId })
    })
    socket.on('disconnect', () => setIsConnected(false))

    socket.on('roomState', handleRoomState)
    socket.on('bidPlaced', handleRoomState)
    socket.on('bidConfirmed', handleRoomState)

    // ── 입찰/낙찰 이벤트 피드 (표시 전용 추가 구독 — 기존 핸들러 무변경) ──
    let eventSeq = 0
    const pushBidEvent = (e: Omit<AuctionBidEvent, 'id' | 'timestamp'>) => {
      eventSeq += 1
      const id = `${Date.now()}-${eventSeq}`
      setBidEvents((prev) => [
        ...prev.slice(-29),
        { ...e, id, timestamp: new Date().toISOString() },
      ])
    }
    socket.on(
      'bidPlaced',
      (p: { bidderName?: string; amount?: number }) => {
        if (typeof p?.amount !== 'number') return
        pushBidEvent({
          kind: 'bid',
          bidderName: p.bidderName ?? '???',
          amount: p.amount,
        })
      },
    )
    socket.on(
      'bidConfirmed',
      (p: { captainId?: string; amount?: number; roomState?: RoomState }) => {
        // 낙찰 연출 트리거 (수동/자동 낙찰 공통)
        setStageEvent((prev) => ({ kind: 'sold', seq: (prev?.seq ?? 0) + 1 }))
        if (typeof p?.amount !== 'number') return
        const team = p.roomState?.teams.find(
          (t) => t.captainId === p.captainId,
        )
        pushBidEvent({
          kind: 'sold',
          bidderName: team?.teamName ?? team?.captainName ?? '???',
          amount: p.amount,
        })
      },
    )
    // 유찰 연출 트리거 (수동/타이머 자동 유찰 공통)
    socket.on('playerPassed', () => {
      setStageEvent((prev) => ({ kind: 'pass', seq: (prev?.seq ?? 0) + 1 }))
    })
    socket.on('playerSelected', handleRoomState)
    socket.on('playerPassed', handleRoomState)
    socket.on('readyForNextPlayer', handleRoomState)
    socket.on('auctionStarted', handleRoomState)
    socket.on('auctionCompleted', handleRoomState)
    socket.on('auctionPaused', handleRoomState)
    socket.on('auctionResumed', handleRoomState)
    socket.on('assignmentPhaseStarted', handleRoomState)
    socket.on('playerManuallyAssigned', handleRoomState)
    socket.on('playerUndone', handleRoomState)
    socket.on('auctionReset', handleRoomState)

    // 입장 시 서버가 보내는 최근 채팅 히스토리로 seed (늦게 입장/재접속/새로고침 복원).
    // id 기준 dedupe 로 재연결 시 중복을 방지한다.
    socket.on('chatHistory', (history: AuctionChatMessage[]) => {
      if (!Array.isArray(history)) return
      setChatMessages((prev) => {
        const byId = new Map<string, AuctionChatMessage>()
        for (const m of history) byId.set(m.id, m)
        for (const m of prev) byId.set(m.id, m)
        return Array.from(byId.values()).slice(-200)
      })
    })

    socket.on('chatMessage', (m: AuctionChatMessage) => {
      // 최근 200개만 유지 (장시간 경매 메모리 보호). id 중복은 무시.
      setChatMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev.slice(-199), m],
      )
    })

    socket.on('timerUpdate', (payload: { remainingTime: number }) => {
      setTimerRemaining(payload.remainingTime)
    })

    socket.on('error', (payload: ErrorPayload) => {
      toast.error(payload?.message ?? '경매 오류가 발생했습니다.')
    })
    socket.on('bidError', (payload: ErrorPayload) => {
      toast.error(payload?.message ?? '입찰에 실패했습니다.')
    })

    return () => {
      socket.emit('leaveRoom', { auctionId })
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
      setRoomState(null)
      setTimerRemaining(null)
      setChatMessages([])
      setBidEvents([])
      setStageEvent(null)
    }
  }, [auctionId, userId])

  // 마스터/입찰자 식별자는 백엔드가 인증 소켓에서 도출한다 — payload 로 보내지 않는다.
  const placeBid = useCallback(
    (targetPlayerId: string, amount: number) => {
      socketRef.current?.emit('placeBid', {
        auctionId,
        targetPlayerId,
        amount,
      })
    },
    [auctionId],
  )
  const selectPlayer = useCallback(
    (playerId: string) => {
      socketRef.current?.emit('selectPlayer', {
        auctionId,
        playerId,
      })
    },
    [auctionId],
  )
  const confirmBid = useCallback(() => {
    socketRef.current?.emit('confirmBid', { auctionId })
  }, [auctionId])
  const passPlayer = useCallback(() => {
    socketRef.current?.emit('passPlayer', { auctionId })
  }, [auctionId])
  const nextPlayer = useCallback(() => {
    socketRef.current?.emit('nextPlayer', { auctionId })
  }, [auctionId])
  const startAuction = useCallback(() => {
    socketRef.current?.emit('startAuction', { auctionId })
  }, [auctionId])
  const completeAuction = useCallback(() => {
    socketRef.current?.emit('completeAuction', { auctionId })
  }, [auctionId])
  const enterAssignmentPhase = useCallback(() => {
    socketRef.current?.emit('enterAssignmentPhase', {
      auctionId,
    })
  }, [auctionId])
  const manualAssignPlayer = useCallback(
    (playerId: string, captainId: string) => {
      socketRef.current?.emit('manualAssignPlayer', {
        auctionId,
        playerId,
        captainId,
      })
    },
    [auctionId],
  )
  const undoSoldPlayer = useCallback(
    (playerId: string) => {
      socketRef.current?.emit('undoSoldPlayer', { auctionId, playerId })
    },
    [auctionId],
  )
  const resetAuction = useCallback(() => {
    socketRef.current?.emit('resetAuction', { auctionId })
  }, [auctionId])
  const pauseAuction = useCallback(() => {
    socketRef.current?.emit('pauseAuction', { auctionId })
  }, [auctionId])
  const resumeAuction = useCallback(() => {
    socketRef.current?.emit('resumeAuction', { auctionId })
  }, [auctionId])
  const sendChat = useCallback(
    (message: string) => {
      const trimmed = message.trim()
      if (!trimmed) return
      socketRef.current?.emit('chatMessage', { auctionId, message: trimmed })
    },
    [auctionId],
  )

  const emit = useMemo<AuctionEmitFns>(
    () => ({
      placeBid,
      selectPlayer,
      confirmBid,
      passPlayer,
      nextPlayer,
      startAuction,
      completeAuction,
      enterAssignmentPhase,
      manualAssignPlayer,
      undoSoldPlayer,
      resetAuction,
      pauseAuction,
      resumeAuction,
      sendChat,
    }),
    [
      placeBid,
      selectPlayer,
      confirmBid,
      passPlayer,
      nextPlayer,
      startAuction,
      completeAuction,
      enterAssignmentPhase,
      manualAssignPlayer,
      undoSoldPlayer,
      resetAuction,
      pauseAuction,
      resumeAuction,
      sendChat,
    ],
  )

  useAuctionSound(bidEvents, stageEvent)

  return {
    isConnected,
    roomState,
    timerRemaining,
    chatMessages,
    bidEvents,
    stageEvent,
    emit,
  }
}
