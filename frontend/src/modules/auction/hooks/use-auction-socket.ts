"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"

export type AuctionStatus = "PENDING" | "ONGOING" | "PAUSED" | "ASSIGNING" | "COMPLETED" | "CANCELLED"
export type BiddingPhase = "WAITING" | "BIDDING" | "SOLD"

export interface AuctionRoomState {
  auction: {
    id: string
    title: string
    status: AuctionStatus
    biddingPhase: BiddingPhase
    startingPoints: number
    turnTimeLimit: number
    teamCount: number
    currentBiddingPlayerId: string | null
    currentBiddingEndTime: string | null
    timerPaused: boolean
    pausedTimeRemaining: number | null
    creatorId: string
  }
  participants: {
    id: string
    userId: string
    role: "CAPTAIN" | "PLAYER" | "SPECTATOR"
    currentPoints: number
    assignedTeamCaptainId: string | null
    wasUnsold: boolean
    biddingOrder: number
    user: {
      id: string
      battleTag: string | null
      mainRole: string | null
    } | null
  }[]
  currentBid: {
    bidderId: string
    bidderName: string
    amount: number
  } | null
  currentPlayer: {
    id: string
    name: string
    role: string
  } | null
  teams: {
    captainId: string
    captainName: string
    points: number
    members: {
      id: string
      name: string
      role: string
      price: number
      wasUnsold: boolean
    }[]
  }[]
  unsoldPlayers: {
    id: string
    name: string
    role: string
  }[]
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: string
  type: "chat" | "system" | "bid"
}

interface UseAuctionSocketOptions {
  auctionId: string
  userId: string
  accessCode?: string
  onRoomState?: (state: AuctionRoomState) => void
  onBidPlaced?: (data: { bidderId: string; bidderName: string; amount: number; roomState: AuctionRoomState }) => void
  onPlayerSelected?: (data: { playerId: string; roomState: AuctionRoomState }) => void
  onBidConfirmed?: (data: { playerId: string; captainId: string; amount: number; auto?: boolean; roomState: AuctionRoomState }) => void
  onPlayerPassed?: (data: { auto?: boolean; roomState: AuctionRoomState }) => void
  onAuctionStarted?: (data: { roomState: AuctionRoomState }) => void
  onAuctionPaused?: (data: { roomState: AuctionRoomState }) => void
  onAuctionResumed?: (data: { roomState: AuctionRoomState }) => void
  onAuctionCompleted?: (data: { roomState: AuctionRoomState }) => void
  onTimerUpdate?: (data: { remainingTime: number }) => void
  onTimerPaused?: (data: { roomState: AuctionRoomState }) => void
  onTimerResumed?: (data: { roomState: AuctionRoomState }) => void
  onPlayerUndone?: (data: { playerId: string; roomState: AuctionRoomState }) => void
  onReadyForNextPlayer?: (data: { roomState: AuctionRoomState }) => void
  onAssignmentPhaseStarted?: (data: { roomState: AuctionRoomState }) => void
  onPlayerManuallyAssigned?: (data: { playerId: string; captainId: string; roomState: AuctionRoomState }) => void
  onScrimCreated?: (data: { scrimId: string; roomState: AuctionRoomState }) => void
  onChatMessage?: (message: ChatMessage) => void
  onError?: (error: { message: string }) => void
}

export function useAuctionSocket({
  auctionId,
  userId,
  accessCode,
  onRoomState,
  onBidPlaced,
  onPlayerSelected,
  onBidConfirmed,
  onPlayerPassed,
  onAuctionStarted,
  onAuctionPaused,
  onAuctionResumed,
  onAuctionCompleted,
  onTimerUpdate,
  onTimerPaused,
  onTimerResumed,
  onPlayerUndone,
  onReadyForNextPlayer,
  onAssignmentPhaseStarted,
  onPlayerManuallyAssigned,
  onScrimCreated,
  onChatMessage,
  onError,
}: UseAuctionSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomState, setRoomState] = useState<AuctionRoomState | null>(null)
  const [timer, setTimer] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://potg.joonbi.co.kr"
    const socket = io(`${backendUrl}/auction`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
      socket.emit("joinRoom", { auctionId, userId, accessCode })
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })

    socket.on("roomState", (state: AuctionRoomState) => {
      setRoomState(state)
      if (state.auction.currentBiddingEndTime && !state.auction.timerPaused) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(state.auction.currentBiddingEndTime).getTime() - Date.now()) / 1000)
        )
        setTimer(remaining)
      } else if (state.auction.pausedTimeRemaining !== null) {
        setTimer(state.auction.pausedTimeRemaining)
      }
      onRoomState?.(state)
    })

    socket.on("bidPlaced", (data) => {
      setRoomState(data.roomState)
      onBidPlaced?.(data)
    })

    socket.on("playerSelected", (data) => {
      setRoomState(data.roomState)
      onPlayerSelected?.(data)
    })

    socket.on("bidConfirmed", (data) => {
      setRoomState(data.roomState)
      setTimer(0)
      onBidConfirmed?.(data)
    })

    socket.on("playerPassed", (data) => {
      setRoomState(data.roomState)
      setTimer(0)
      onPlayerPassed?.(data)
    })

    socket.on("auctionStarted", (data) => {
      setRoomState(data.roomState)
      onAuctionStarted?.(data)
    })

    socket.on("auctionPaused", (data) => {
      setRoomState(data.roomState)
      onAuctionPaused?.(data)
    })

    socket.on("auctionResumed", (data) => {
      setRoomState(data.roomState)
      onAuctionResumed?.(data)
    })

    socket.on("auctionCompleted", (data) => {
      setRoomState(data.roomState)
      onAuctionCompleted?.(data)
    })

    socket.on("timerUpdate", (data: { remainingTime: number }) => {
      setTimer(data.remainingTime)
      onTimerUpdate?.(data)
    })

    socket.on("timerPaused", (data) => {
      setRoomState(data.roomState)
      onTimerPaused?.(data)
    })

    socket.on("timerResumed", (data) => {
      setRoomState(data.roomState)
      onTimerResumed?.(data)
    })

    socket.on("playerUndone", (data) => {
      setRoomState(data.roomState)
      onPlayerUndone?.(data)
    })

    socket.on("readyForNextPlayer", (data) => {
      setRoomState(data.roomState)
      onReadyForNextPlayer?.(data)
    })

    socket.on("assignmentPhaseStarted", (data) => {
      setRoomState(data.roomState)
      onAssignmentPhaseStarted?.(data)
    })

    socket.on("playerManuallyAssigned", (data) => {
      setRoomState(data.roomState)
      onPlayerManuallyAssigned?.(data)
    })

    socket.on("scrimCreated", (data) => {
      setRoomState(data.roomState)
      onScrimCreated?.(data)
    })

    socket.on("chatMessage", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message])
      onChatMessage?.(message)
    })

    socket.on("error", (error: { message: string }) => {
      onError?.(error)
    })

    socket.on("bidError", (error: { message: string }) => {
      onError?.(error)
    })

    return () => {
      socket.emit("leaveRoom", { auctionId, userId })
      socket.disconnect()
    }
  }, [auctionId, userId, accessCode])

  // Basic actions
  const placeBid = useCallback(
    (targetPlayerId: string, amount: number) => {
      socketRef.current?.emit("placeBid", {
        auctionId,
        bidderId: userId,
        targetPlayerId,
        amount,
      })
    },
    [auctionId, userId]
  )

  const selectPlayer = useCallback(
    (playerId: string) => {
      socketRef.current?.emit("selectPlayer", {
        auctionId,
        adminId: userId,
        playerId,
      })
    },
    [auctionId, userId]
  )

  const confirmBid = useCallback(() => {
    socketRef.current?.emit("confirmBid", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const passPlayer = useCallback(() => {
    socketRef.current?.emit("passPlayer", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const startAuction = useCallback(() => {
    socketRef.current?.emit("startAuction", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const completeAuction = useCallback(() => {
    socketRef.current?.emit("completeAuction", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  // Master control actions
  const pauseAuction = useCallback(() => {
    socketRef.current?.emit("pauseAuction", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const resumeAuction = useCallback(() => {
    socketRef.current?.emit("resumeAuction", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const pauseTimer = useCallback(() => {
    socketRef.current?.emit("pauseTimer", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const resumeTimer = useCallback(() => {
    socketRef.current?.emit("resumeTimer", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const undoSoldPlayer = useCallback(
    (playerId: string) => {
      socketRef.current?.emit("undoSoldPlayer", {
        auctionId,
        adminId: userId,
        playerId,
      })
    },
    [auctionId, userId]
  )

  const nextPlayer = useCallback(() => {
    socketRef.current?.emit("nextPlayer", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const enterAssignmentPhase = useCallback(() => {
    socketRef.current?.emit("enterAssignmentPhase", {
      auctionId,
      adminId: userId,
    })
  }, [auctionId, userId])

  const manualAssignPlayer = useCallback(
    (playerId: string, captainId: string) => {
      socketRef.current?.emit("manualAssignPlayer", {
        auctionId,
        adminId: userId,
        playerId,
        captainId,
      })
    },
    [auctionId, userId]
  )

  const createScrim = useCallback(
    (scheduledDate: Date) => {
      socketRef.current?.emit("createScrim", {
        auctionId,
        adminId: userId,
        scheduledDate: scheduledDate.toISOString(),
      })
    },
    [auctionId, userId]
  )

  const sendChatMessage = useCallback(
    (message: string, userName: string) => {
      socketRef.current?.emit("chatMessage", {
        auctionId,
        userId,
        userName,
        message,
      })
    },
    [auctionId, userId]
  )

  const requestRoomState = useCallback(() => {
    socketRef.current?.emit("requestRoomState", { auctionId })
  }, [auctionId])

  return {
    isConnected,
    roomState,
    timer,
    messages,
    // Basic actions
    placeBid,
    selectPlayer,
    confirmBid,
    passPlayer,
    startAuction,
    completeAuction,
    // Master control actions
    pauseAuction,
    resumeAuction,
    pauseTimer,
    resumeTimer,
    undoSoldPlayer,
    nextPlayer,
    enterAssignmentPhase,
    manualAssignPlayer,
    createScrim,
    sendChatMessage,
    requestRoomState,
  }
}
