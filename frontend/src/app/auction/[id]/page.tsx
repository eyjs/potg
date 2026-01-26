"use client"

import { useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { ArrowLeft, Shield, Crosshair, Heart, Users, Gavel, Clock, Send, Pause, Play, Check, X, SkipForward, Eye } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuctionSocket } from "@/modules/auction/hooks/use-auction-socket"
import { MasterControlPanel } from "@/modules/auction/components/master-control-panel"
import { AuctionTeamPanel } from "@/modules/auction/components/auction-team-panel"
import { AuctionResultsPoster } from "@/modules/auction/components/auction-results-poster"
import { AuctionSetupPanel } from "@/modules/auction/components/auction-setup-panel"
import { toast } from "sonner"

const roleConfig = {
  tank: { icon: Shield, color: "text-yellow-500", bg: "bg-yellow-500/20", label: "Tank" },
  dps: { icon: Crosshair, color: "text-red-500", bg: "bg-red-500/20", label: "DPS" },
  support: { icon: Heart, color: "text-green-500", bg: "bg-green-500/20", label: "Support" },
  flex: { icon: Users, color: "text-purple-500", bg: "bg-purple-500/20", label: "Flex" },
}

const statusConfig: Record<string, { color: string; label: string }> = {
  ONGOING: { color: "bg-green-500", label: "진행중" },
  PAUSED: { color: "bg-yellow-500", label: "일시정지" },
  ASSIGNING: { color: "bg-blue-500", label: "수동배정" },
  COMPLETED: { color: "bg-primary", label: "완료" },
  PENDING: { color: "bg-muted", label: "대기중" },
}

const teamColors = ["#F99E1A", "#00C3FF", "#FF4649", "#00FF88", "#FF00FF", "#FFFF00"]

const DEFAULT_TURN_TIME_LIMIT = 30

export default function AuctionRoomPage() {
  const params = useParams()
  const auctionId = params.id as string
  const router = useRouter()
  const { user } = useAuth()
  const [chatInput, setChatInput] = useState("")
  const [selectedBidAmount, setSelectedBidAmount] = useState(100)

  const [selectedUnsoldPlayer, setSelectedUnsoldPlayer] = useState<string | null>(null)

  const {
    isConnected,
    roomState,
    timer,
    messages,
    placeBid,
    selectPlayer,
    confirmBid,
    passPlayer,
    startAuction,
    completeAuction,
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
  } = useAuctionSocket({
    auctionId,
    userId: user?.id || "",
    onError: (error) => {
      toast.error(error.message)
    },
    onBidPlaced: (data) => {
      toast(`${data.bidderName}님이 ${data.amount.toLocaleString()}P 입찰!`)
    },
    onBidConfirmed: (data) => {
      toast.success(data.auto ? "시간 초과 - 자동 낙찰되었습니다" : "낙찰이 확정되었습니다")
    },
    onPlayerPassed: (data) => {
      toast.info(data.auto ? "입찰 없음 - 자동 유찰되었습니다" : "유찰 처리되었습니다")
    },
    onPlayerUndone: () => {
      toast.info("낙찰이 취소되었습니다")
    },
    onAssignmentPhaseStarted: () => {
      toast.info("수동 배정 단계로 전환되었습니다")
    },
    onPlayerManuallyAssigned: () => {
      toast.success("선수가 팀에 배정되었습니다")
      setSelectedUnsoldPlayer(null)
    },
    onScrimCreated: () => {
      toast.success("스크림이 생성되었습니다!")
    },
  })

  // Derived state
  const userRole = useMemo(() => {
    if (user?.role === "ADMIN" || roomState?.auction?.creatorId === user?.id) return "admin"
    const myPart = roomState?.participants?.find((p) => p.user?.id === user?.id)
    if (myPart?.role === "CAPTAIN") return "captain"
    return "spectator"
  }, [user, roomState])

  const myTeam = useMemo(() => {
    if (userRole !== "captain") return null
    return roomState?.teams?.find((t) => t.captainId === user?.id) || null
  }, [userRole, roomState, user])

  const currentPlayer = roomState?.currentPlayer
  const currentBid = roomState?.currentBid
  const auctionStatus = roomState?.auction?.status || "PENDING"
  const biddingPhase = roomState?.auction?.biddingPhase || "WAITING"
  const isActive = auctionStatus === "ONGOING"
  const isPaused = auctionStatus === "PAUSED"
  const isAssigning = auctionStatus === "ASSIGNING"
  const isCompleted = auctionStatus === "COMPLETED"
  const isBidding = biddingPhase === "BIDDING"

  const availablePlayers = useMemo(() => {
    if (!roomState) return []
    return roomState.participants
      .filter((p) => p.role === "PLAYER" && !p.assignedTeamCaptainId)
      .map((p) => ({
        id: p.user?.id || p.id,
        name: p.user?.battleTag?.split("#")[0] || "선수",
        role: (p.user?.mainRole?.toLowerCase() || "flex") as keyof typeof roleConfig,
      }))
  }, [roomState])

  const handleBid = useCallback(() => {
    if (!currentPlayer) return
    const newAmount = (currentBid?.amount || 0) + selectedBidAmount
    placeBid(currentPlayer.id, newAmount)
  }, [currentPlayer, currentBid, selectedBidAmount, placeBid])

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return
    sendChatMessage(chatInput, user?.battleTag?.split("#")[0] || "익명")
    setChatInput("")
  }, [chatInput, sendChatMessage, user])

  if (!isConnected || !roomState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-bold uppercase italic tracking-widest animate-pulse">
            경매방 연결 중...
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header />
        </div>

        {/* Mobile Sticky Header */}
        <div className="md:hidden sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/auction")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h1 className="font-bold text-sm uppercase tracking-wide truncate max-w-[200px]">
                {roomState.auction.title}
              </h1>
              <Badge
                className={cn(
                  "text-xs",
                  statusConfig[auctionStatus]?.color || "bg-muted"
                )}
              >
                {statusConfig[auctionStatus]?.label || "종료"}
              </Badge>
            </div>
            <Badge
              className={cn(
                "skew-btn text-xs",
                userRole === "admin" ? "bg-destructive" : userRole === "captain" ? "bg-primary" : "bg-muted"
              )}
            >
              {userRole.toUpperCase()}
            </Badge>
          </div>

          {/* Mobile Current Player/Bid Info */}
          {isActive && currentPlayer && (
            <div className="px-3 pb-2 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">🎯</span>
                  <span className="font-semibold truncate max-w-[150px]">{currentPlayer.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {currentPlayer.role || "flex"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">💰</span>
                {currentBid ? (
                  <span>
                    <span className="font-bold text-primary">{currentBid.amount.toLocaleString()}P</span>
                    <span className="text-muted-foreground"> by {currentBid.bidderName}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">입찰 대기 중</span>
                )}
              </div>
            </div>
          )}

          {/* Mobile Timer Bar */}
          {isActive && currentPlayer && isBidding && (
            <div className="px-3 pb-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    roomState.auction.timerPaused ? "bg-yellow-500" :
                    timer > 10 ? "bg-primary" : timer > 5 ? "bg-yellow-500" : "bg-destructive"
                  )}
                  style={{ width: `${(timer / (roomState.auction.turnTimeLimit || DEFAULT_TURN_TIME_LIMIT)) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                <span className="text-lg font-black">{timer}초</span>
                {roomState.auction.timerPaused && (
                  <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                    정지
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sub Header */}
        <div className="hidden md:block border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="container px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/auction")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록으로
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="font-bold text-lg italic uppercase tracking-wide">
                {roomState.auction.title} <span className="text-primary">드래프트</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {isActive && currentPlayer && (
                <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span
                    className={cn(
                      "text-xl font-black",
                      timer > 10 ? "text-primary" : timer > 5 ? "text-yellow-500" : "text-destructive"
                    )}
                  >
                    {timer}초
                  </span>
                </div>
              )}
              <Badge
                className={cn(
                  "skew-btn",
                  userRole === "admin" ? "bg-destructive" : userRole === "captain" ? "bg-primary" : "bg-muted"
                )}
              >
                {userRole.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 container px-4 py-4 pb-32 md:pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Player Pool - Hidden on mobile when bidding */}
            <div className={cn("lg:col-span-3", isActive && currentPlayer ? "hidden md:block" : "block")}>
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-bold uppercase tracking-wide">선수 풀</h3>
                    <span className="text-sm text-muted-foreground">({availablePlayers.length})</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availablePlayers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">모든 선수가 배정됨</p>
                  ) : (
                    availablePlayers.map((player) => {
                      const config = roleConfig[player.role] || roleConfig.flex
                      const Icon = config.icon
                      const isClickable = userRole === "admin" && isActive
                      const handleSelect = () => isClickable && selectPlayer(player.id)
                      const isBiddingPlayer = roomState?.auction?.currentBiddingPlayerId === player.id
                      return (
                        <div
                          key={player.id}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onClick={handleSelect}
                          onKeyDown={(e) => {
                            if (isClickable && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault()
                              handleSelect()
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded border transition-colors",
                            isBiddingPlayer
                              ? "border-primary bg-primary/10"
                              : "border-border/50",
                            isClickable && !isBiddingPlayer
                              ? "cursor-pointer hover:bg-muted/50 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                              : ""
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg)}>
                            <Icon className={cn("w-5 h-5", config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{player.name}</p>
                              {isBiddingPlayer && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                  경매중
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground capitalize">{config.label}</p>
                          </div>
                          {!isBiddingPlayer && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              대기
                            </Badge>
                          )}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Auction Stage */}
            <div className="lg:col-span-5">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  {/* Current Player Display */}
                  <div className="min-h-[250px] flex flex-col items-center justify-center">
                    {currentPlayer ? (
                      <>
                        {(() => {
                          const playerRole = (currentPlayer.role || "flex") as keyof typeof roleConfig
                          const config = roleConfig[playerRole] || roleConfig.flex
                          const Icon = config.icon
                          return (
                            <div
                              className={cn(
                                "w-36 h-48 md:w-40 md:h-52 rounded-lg border-2 flex flex-col items-center justify-center p-4",
                                isActive ? "border-primary animate-pulse" : "border-border",
                                config.bg
                              )}
                            >
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-background/50 flex items-center justify-center mb-3">
                                <Icon className={cn("w-7 h-7 md:w-8 md:h-8", config.color)} />
                              </div>
                              <h3 className="font-bold text-lg md:text-xl text-center">{currentPlayer.name}</h3>
                              <p className="text-sm text-muted-foreground capitalize">{config.label}</p>
                            </div>
                          )
                        })()}

                        {/* Current Bid Info */}
                        {currentBid && (
                          <div className="mt-4 text-center">
                            <p className="text-muted-foreground text-sm">현재 최고 입찰</p>
                            <p className="text-3xl md:text-4xl font-black text-primary">
                              {currentBid.amount.toLocaleString()}P
                            </p>
                            <p className="text-sm text-muted-foreground">by {currentBid.bidderName}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Gavel className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        {auctionStatus === "PENDING" ? (
                          <>
                            <p className="font-semibold">경매 시작을 기다리는 중</p>
                            <p className="text-sm mt-1">관리자가 경매를 시작해주세요</p>
                          </>
                        ) : isCompleted ? (
                          <>
                            <p className="font-semibold">경매가 종료되었습니다</p>
                            <p className="text-sm mt-1">아래에서 결과를 확인하세요</p>
                          </>
                        ) : isAssigning ? (
                          <>
                            <p className="font-semibold">수동 배정 단계</p>
                            <p className="text-sm mt-1">유찰된 선수를 팀에 배정 중입니다</p>
                          </>
                        ) : isPaused ? (
                          <>
                            <p className="font-semibold">경매가 일시 정지되었습니다</p>
                            <p className="text-sm mt-1">잠시 후 재개됩니다</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold">선수를 선택하여 경매를 시작하세요</p>
                            <p className="text-sm mt-1">왼쪽 선수 풀에서 선수를 클릭하세요</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop Bidding Controls (Captain Only) */}
                  {userRole === "captain" && isActive && currentPlayer && (
                    <div className="hidden md:block mt-6 space-y-3">
                      {myTeam && (
                        <p className="text-center text-sm text-muted-foreground">
                          보유 포인트: <span className="text-primary font-bold">{myTeam.points.toLocaleString()}P</span>
                        </p>
                      )}
                      <div className="grid grid-cols-4 gap-2">
                        {[100, 200, 500, 1000].map((amount) => (
                          <Button
                            key={amount}
                            size="lg"
                            variant={selectedBidAmount === amount ? "default" : "outline"}
                            className={cn(
                              "skew-btn font-bold text-lg",
                              selectedBidAmount === amount && "bg-primary text-primary-foreground"
                            )}
                            onClick={() => setSelectedBidAmount(amount)}
                          >
                            +{amount}
                          </Button>
                        ))}
                      </div>
                      <Button
                        size="lg"
                        className="w-full skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
                        onClick={handleBid}
                        disabled={!!(myTeam && myTeam.points < (currentBid?.amount || 0) + selectedBidAmount)}
                      >
                        {((currentBid?.amount || 0) + selectedBidAmount).toLocaleString()}P 입찰
                      </Button>
                    </div>
                  )}

                  {/* Admin Status Note */}
                  {userRole === "admin" && isActive && (
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                      <p>오른쪽 마스터 컨트롤 패널에서 경매를 조작하세요</p>
                    </div>
                  )}

                  {/* Paused Notice */}
                  {isPaused && (
                    <div className="mt-6 text-center">
                      <Badge className="bg-yellow-500 text-white text-lg py-2 px-4">
                        경매 일시 정지됨
                      </Badge>
                    </div>
                  )}

                  {/* Assignment Phase Notice */}
                  {isAssigning && (
                    <div className="mt-6 text-center">
                      <Badge className="bg-blue-500 text-white text-lg py-2 px-4">
                        수동 배정 단계
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        유찰된 선수를 팀에 배정 중입니다
                      </p>
                    </div>
                  )}

                  {/* Spectator Notice */}
                  {userRole === "spectator" && isActive && (
                    <div className="mt-6 text-center text-muted-foreground">
                      <p>관전 모드 - 입찰에 참여할 수 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Teams & Chat */}
            <div className="lg:col-span-4 space-y-4">
              {/* Auction Setup Panel (Admin Only, PENDING status) */}
              {userRole === "admin" && auctionStatus === "PENDING" && user?.clanId && (
                <AuctionSetupPanel
                  auctionId={auctionId}
                  clanId={user.clanId}
                  participants={roomState.participants}
                  settings={{
                    teamCount: roomState.auction.teamCount || 2,
                    startingPoints: roomState.auction.startingPoints || 10000,
                    turnTimeLimit: roomState.auction.turnTimeLimit || 30,
                  }}
                  onRefresh={requestRoomState}
                />
              )}

              {/* Master Control Panel (Admin Only) */}
              {userRole === "admin" && (
                <MasterControlPanel
                  roomState={roomState}
                  timer={timer}
                  onStartAuction={startAuction}
                  onPauseAuction={pauseAuction}
                  onResumeAuction={resumeAuction}
                  onCompleteAuction={completeAuction}
                  onPauseTimer={pauseTimer}
                  onResumeTimer={resumeTimer}
                  onConfirmBid={confirmBid}
                  onPassPlayer={passPlayer}
                  onNextPlayer={nextPlayer}
                  onEnterAssignmentPhase={enterAssignmentPhase}
                  onCreateScrim={createScrim}
                />
              )}

              {/* Teams */}
              <AuctionTeamPanel
                teams={roomState.teams}
                unsoldPlayers={roomState.unsoldPlayers}
                isAdmin={userRole === "admin"}
                isAssignmentPhase={isAssigning}
                selectedUnsoldPlayer={selectedUnsoldPlayer}
                onUndoPlayer={undoSoldPlayer}
                onAssignPlayer={manualAssignPlayer}
                onSelectUnsoldPlayer={setSelectedUnsoldPlayer}
              />

              {/* Chat */}
              <Card className="border-border/50 hidden md:block">
                <CardHeader className="pb-2">
                  <h3 className="font-bold uppercase tracking-wide">채팅</h3>
                </CardHeader>
                <CardContent>
                  <div className="h-48 overflow-y-auto space-y-2 mb-3 bg-muted/30 rounded p-2">
                    {messages.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">아직 메시지가 없습니다</p>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-semibold text-primary">{msg.userName}: </span>
                          <span>{msg.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder="메시지 입력..."
                      className="flex-1 bg-muted rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button size="icon" onClick={handleSendChat}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results Poster (Completed) */}
          {isCompleted && (
            <div className="mt-8">
              <AuctionResultsPoster
                title={roomState.auction.title}
                teams={roomState.teams}
              />
            </div>
          )}
        </div>

        {/* Mobile Floating Bid Controls (Captain) */}
        {userRole === "captain" && isActive && currentPlayer && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 safe-area-pb">
            {myTeam && (
              <p className="text-center text-sm text-muted-foreground mb-2">
                보유: <span className="text-primary font-bold">{myTeam.points.toLocaleString()}P</span>
              </p>
            )}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[100, 200, 500, 1000].map((amount) => (
                <Button
                  key={amount}
                  size="sm"
                  variant={selectedBidAmount === amount ? "default" : "outline"}
                  className={cn("font-bold", selectedBidAmount === amount && "bg-primary text-primary-foreground")}
                  onClick={() => setSelectedBidAmount(amount)}
                >
                  +{amount}
                </Button>
              ))}
            </div>
            <Button
              size="lg"
              className="w-full skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
              onClick={handleBid}
              disabled={!!(myTeam && myTeam.points < (currentBid?.amount || 0) + selectedBidAmount)}
            >
              {((currentBid?.amount || 0) + selectedBidAmount).toLocaleString()}P 입찰
            </Button>
          </div>
        )}

        {/* Mobile Floating Admin Controls */}
        {userRole === "admin" && (isActive || isPaused) && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-destructive/10 backdrop-blur-sm border-t border-destructive/30 p-4 safe-area-pb">
            <div className="space-y-2">
              {/* Main Controls when bidding */}
              {currentPlayer && isBidding && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="lg"
                    className="skew-btn bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() => confirmBid()}
                    disabled={!currentBid}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    낙찰
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="skew-btn border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-bold"
                    onClick={() => passPlayer()}
                  >
                    <X className="w-4 h-4 mr-2" />
                    유찰
                  </Button>
                </div>
              )}

              {/* Next Player when not bidding */}
              {isActive && !currentPlayer && biddingPhase === "WAITING" && (
                <Button
                  size="lg"
                  className="w-full skew-btn bg-primary hover:bg-primary/90 font-bold"
                  onClick={nextPlayer}
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  다음 선수
                </Button>
              )}

              {/* Timer Controls */}
              <div className="grid grid-cols-2 gap-2">
                {isPaused ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/10"
                    onClick={resumeAuction}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    경매 재개
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={pauseAuction}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    일시정지
                  </Button>
                )}
                {roomState.auction.timerPaused ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/10"
                    onClick={resumeTimer}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    타이머 재개
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pauseTimer}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    타이머 정지
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Spectator Bottom Bar */}
        {userRole === "spectator" && isActive && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-sm border-t border-border py-2 px-4 safe-area-pb">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>관전 중</span>
              </div>
              {roomState.teams.map((team, index) => (
                <div key={team.captainId} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: teamColors[index % teamColors.length] }}
                  />
                  <span className="font-semibold" style={{ color: teamColors[index % teamColors.length] }}>
                    {team.members.length}명
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
