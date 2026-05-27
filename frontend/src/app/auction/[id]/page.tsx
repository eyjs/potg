"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import {
  ArrowLeft,
  Shield,
  Crosshair,
  Heart,
  Users,
  Gavel,
  Clock,
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuctionSocket } from "@/modules/auction/hooks/use-auction-socket"
import { useAuctionRoom } from "@/modules/auction/hooks/use-auction-room"
import { MasterControlPanel } from "@/modules/auction/components/master-control-panel"
import { AuctionTeamPanel } from "@/modules/auction/components/auction-team-panel"
import { AuctionResultsPoster } from "@/modules/auction/components/auction-results-poster"
import { AuctionSetupPanel } from "@/modules/auction/components/auction-setup-panel"
import { AuctionChat } from "@/modules/auction/components/auction-chat"
import { MobileBidBar } from "@/modules/auction/components/mobile-bid-bar"
import { MobileAdminBar } from "@/modules/auction/components/mobile-admin-bar"
import { MobileSpectatorBar } from "@/modules/auction/components/mobile-spectator-bar"
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

  const socket = useAuctionSocket({
    auctionId,
    userId: user?.id || "",
    onError: (error) => toast.error(error.message),
    onBidPlaced: (data) =>
      toast(`${data.bidderName}님이 ${data.amount.toLocaleString()}P 입찰!`),
    onBidConfirmed: (data) =>
      toast.success(data.auto ? "시간 초과 - 자동 낙찰되었습니다" : "낙찰이 확정되었습니다"),
    onPlayerPassed: (data) =>
      toast.info(data.auto ? "입찰 없음 - 자동 유찰되었습니다" : "유찰 처리되었습니다"),
    onPlayerUndone: () => toast.info("낙찰이 취소되었습니다"),
    onAssignmentPhaseStarted: () => toast.info("수동 배정 단계로 전환되었습니다"),
    onPlayerManuallyAssigned: () => {
      toast.success("선수가 팀에 배정되었습니다")
      room.setSelectedUnsoldPlayer(null)
    },
    onScrimCreated: () => toast.success("스크림이 생성되었습니다!"),
  })

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
  } = socket

  const room = useAuctionRoom({
    user: user
      ? { id: user.id, role: user.role, battleTag: user.battleTag ?? null }
      : null,
    roomState,
    placeBid,
    sendChatMessage,
  })

  const {
    chatInput,
    setChatInput,
    selectedBidAmount,
    setSelectedBidAmount,
    selectedUnsoldPlayer,
    setSelectedUnsoldPlayer,
    userRole,
    myTeam,
    availablePlayers,
    handleBid,
    handleSendChat,
  } = room

  const currentPlayer = roomState?.currentPlayer
  const currentBid = roomState?.currentBid
  const auctionStatus = roomState?.auction?.status || "PENDING"
  const biddingPhase = roomState?.auction?.biddingPhase || "WAITING"
  const isActive = auctionStatus === "ONGOING"
  const isPaused = auctionStatus === "PAUSED"
  const isAssigning = auctionStatus === "ASSIGNING"
  const isCompleted = auctionStatus === "COMPLETED"
  const isBidding = biddingPhase === "BIDDING"
  const turnTimeLimit =
    roomState?.auction?.turnTimeLimit || DEFAULT_TURN_TIME_LIMIT

  const showMobileNextPlayer = useMemo(
    () => isActive && !currentPlayer && biddingPhase === "WAITING",
    [isActive, currentPlayer, biddingPhase],
  )

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
                  statusConfig[auctionStatus]?.color || "bg-muted",
                )}
              >
                {statusConfig[auctionStatus]?.label || "종료"}
              </Badge>
            </div>
            <Badge
              className={cn(
                "skew-btn text-xs",
                userRole === "admin" ? "bg-destructive" : userRole === "captain" ? "bg-primary" : "bg-muted",
              )}
            >
              {userRole.toUpperCase()}
            </Badge>
          </div>

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

          {isActive && currentPlayer && isBidding && (
            <div className="px-3 pb-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    roomState.auction.timerPaused
                      ? "bg-yellow-500"
                      : timer > 10
                        ? "bg-primary"
                        : timer > 5
                          ? "bg-yellow-500"
                          : "bg-destructive",
                  )}
                  style={{ width: `${(timer / turnTimeLimit) * 100}%` }}
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
                      timer > 10 ? "text-primary" : timer > 5 ? "text-yellow-500" : "text-destructive",
                    )}
                  >
                    {timer}초
                  </span>
                </div>
              )}
              <Badge
                className={cn(
                  "skew-btn",
                  userRole === "admin" ? "bg-destructive" : userRole === "captain" ? "bg-primary" : "bg-muted",
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
            {/* Player Pool */}
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
                      const isBiddingPlayer = roomState.auction.currentBiddingPlayerId === player.id
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
                            isBiddingPlayer ? "border-primary bg-primary/10" : "border-border/50",
                            isClickable && !isBiddingPlayer
                              ? "cursor-pointer hover:bg-muted/50 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                              : "",
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
                                config.bg,
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
                              selectedBidAmount === amount && "bg-primary text-primary-foreground",
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

                  {userRole === "admin" && isActive && (
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                      <p>오른쪽 마스터 컨트롤 패널에서 경매를 조작하세요</p>
                    </div>
                  )}

                  {isPaused && (
                    <div className="mt-6 text-center">
                      <Badge className="bg-yellow-500 text-white text-lg py-2 px-4">
                        경매 일시 정지됨
                      </Badge>
                    </div>
                  )}

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

              <AuctionChat
                messages={messages}
                chatInput={chatInput}
                onChatInputChange={setChatInput}
                onSend={handleSendChat}
              />
            </div>
          </div>

          {isCompleted && (
            <div className="mt-8">
              <AuctionResultsPoster
                title={roomState.auction.title}
                teams={roomState.teams}
              />
            </div>
          )}
        </div>

        {/* Mobile Floating bars */}
        {userRole === "captain" && isActive && currentPlayer && (
          <MobileBidBar
            myTeamPoints={myTeam?.points}
            currentBidAmount={currentBid?.amount}
            selectedBidAmount={selectedBidAmount}
            onSelectAmount={setSelectedBidAmount}
            onBid={handleBid}
          />
        )}

        {userRole === "admin" && (isActive || isPaused) && (
          <MobileAdminBar
            isPaused={isPaused}
            isTimerPaused={Boolean(roomState.auction.timerPaused)}
            hasCurrentPlayer={Boolean(currentPlayer)}
            isBidding={isBidding}
            hasCurrentBid={Boolean(currentBid)}
            canShowNextPlayer={showMobileNextPlayer}
            onConfirmBid={() => confirmBid()}
            onPassPlayer={() => passPlayer()}
            onNextPlayer={nextPlayer}
            onPauseAuction={pauseAuction}
            onResumeAuction={resumeAuction}
            onPauseTimer={pauseTimer}
            onResumeTimer={resumeTimer}
          />
        )}

        {userRole === "spectator" && isActive && (
          <MobileSpectatorBar teams={roomState.teams} teamColors={teamColors} />
        )}
      </div>
    </AuthGuard>
  )
}
