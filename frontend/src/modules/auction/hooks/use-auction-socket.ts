'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import type { RoomState } from '../types'

const SOCKET_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://potg.joonbi.co.kr'

interface ErrorPayload {
  message?: string
}

export interface AuctionEmitFns {
  placeBid: (bidderId: string, targetPlayerId: string, amount: number) => void
  selectPlayer: (playerId: string) => void
  confirmBid: () => void
  passPlayer: () => void
  nextPlayer: () => void
  startAuction: () => void
  completeAuction: () => void
  enterAssignmentPhase: () => void
  manualAssignPlayer: (playerId: string, captainId: string) => void
  resetAuction: () => void
}

interface UseAuctionSocketReturn {
  isConnected: boolean
  roomState: RoomState | null
  timerRemaining: number | null
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

    const handleRoomState = (payload: { roomState: RoomState }) => {
      setRoomState(payload.roomState)
    }

    // socket.io-client 가 자동 재연결 시 'connect' 이벤트가 다시 발화하므로
    // joinRoom 도 매 재연결마다 다시 emit 되어 room membership 이 자동 복원된다.
    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('joinRoom', { auctionId, userId })
    })
    socket.on('disconnect', () => setIsConnected(false))

    socket.on('roomState', handleRoomState)
    socket.on('bidPlaced', handleRoomState)
    socket.on('bidConfirmed', handleRoomState)
    socket.on('playerSelected', handleRoomState)
    socket.on('playerPassed', handleRoomState)
    socket.on('readyForNextPlayer', handleRoomState)
    socket.on('auctionStarted', handleRoomState)
    socket.on('auctionCompleted', handleRoomState)
    socket.on('auctionPaused', handleRoomState)
    socket.on('auctionResumed', handleRoomState)
    socket.on('assignmentPhaseStarted', handleRoomState)
    socket.on('playerManuallyAssigned', handleRoomState)
    socket.on('auctionReset', handleRoomState)

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
      socket.emit('leaveRoom', { auctionId, userId })
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
      setRoomState(null)
      setTimerRemaining(null)
    }
  }, [auctionId, userId])

  const placeBid = useCallback(
    (bidderId: string, targetPlayerId: string, amount: number) => {
      socketRef.current?.emit('placeBid', {
        auctionId,
        bidderId,
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
        adminId: userId,
        playerId,
      })
    },
    [auctionId, userId],
  )
  const confirmBid = useCallback(() => {
    socketRef.current?.emit('confirmBid', { auctionId, adminId: userId })
  }, [auctionId, userId])
  const passPlayer = useCallback(() => {
    socketRef.current?.emit('passPlayer', { auctionId, adminId: userId })
  }, [auctionId, userId])
  const nextPlayer = useCallback(() => {
    socketRef.current?.emit('nextPlayer', { auctionId, adminId: userId })
  }, [auctionId, userId])
  const startAuction = useCallback(() => {
    socketRef.current?.emit('startAuction', { auctionId, adminId: userId })
  }, [auctionId, userId])
  const completeAuction = useCallback(() => {
    socketRef.current?.emit('completeAuction', { auctionId, adminId: userId })
  }, [auctionId, userId])
  const enterAssignmentPhase = useCallback(() => {
    socketRef.current?.emit('enterAssignmentPhase', {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])
  const manualAssignPlayer = useCallback(
    (playerId: string, captainId: string) => {
      socketRef.current?.emit('manualAssignPlayer', {
        auctionId,
        adminId: userId,
        playerId,
        captainId,
      })
    },
    [auctionId, userId],
  )
  const resetAuction = useCallback(() => {
    socketRef.current?.emit('resetAuction', { auctionId, adminId: userId })
  }, [auctionId, userId])

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
      resetAuction,
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
      resetAuction,
    ],
  )

  return {
    isConnected,
    roomState,
    timerRemaining,
    emit,
  }
}
