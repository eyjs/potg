"use client"

import { useState, useEffect } from "react"
import { useDialog } from "@/common/hooks/use-dialog"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { Checkbox } from "@/common/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog"
import {
  Settings,
  Users,
  UserPlus,
  Crown,
  X,
  Save,
  Shield,
  Crosshair,
  Heart,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import api from "@/lib/api"
import { useConfirm } from "@/common/components/confirm-dialog"

interface ClanMember {
  userId: string
  user: {
    id: string
    battleTag: string
    mainRole?: string
    avatarUrl?: string
  }
  role: string
}

interface AuctionParticipant {
  id: string
  userId: string
  role: "CAPTAIN" | "PLAYER" | "SPECTATOR"
  user?: {
    battleTag: string | null
    mainRole?: string | null
    avatarUrl?: string
  } | null
}

interface AuctionSettings {
  teamCount: number
  startingPoints: number
  turnTimeLimit: number
}

interface AuctionSetupPanelProps {
  auctionId: string
  clanId: string
  participants: AuctionParticipant[]
  settings: AuctionSettings
  onRefresh: () => void
}

const roleConfig = {
  tank: { icon: Shield, color: "text-yellow-500", bg: "bg-yellow-500/20" },
  dps: { icon: Crosshair, color: "text-red-500", bg: "bg-red-500/20" },
  support: { icon: Heart, color: "text-green-500", bg: "bg-green-500/20" },
  flex: { icon: Users, color: "text-purple-500", bg: "bg-purple-500/20" },
}

export function AuctionSetupPanel({
  auctionId,
  clanId,
  participants,
  settings,
  onRefresh,
}: AuctionSetupPanelProps) {
  const confirm = useConfirm()
  const settingsDialog = useDialog()
  const addPlayersDialog = useDialog()
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editSettings, setEditSettings] = useState(settings)

  const players = participants.filter(p => p.role === "PLAYER")
  const captains = participants.filter(p => p.role === "CAPTAIN")

  useEffect(() => {
    if (addPlayersDialog.isOpen) {
      fetchClanMembers()
    }
  }, [addPlayersDialog.isOpen])

  const fetchClanMembers = async () => {
    try {
      const res = await api.get(`/clans/${clanId}/members`)
      setClanMembers(res.data)
    } catch (error) {
      toast.error("클랜원 목록을 불러올 수 없습니다.")
    }
  }

  const handleAddPlayers = async () => {
    if (selectedMembers.length === 0) {
      toast.error("선택된 클랜원이 없습니다.")
      return
    }

    setIsLoading(true)
    try {
      await api.post(`/auctions/${auctionId}/players/bulk`, { userIds: selectedMembers })
      toast.success(`${selectedMembers.length}명의 매물이 등록되었습니다.`)
      setSelectedMembers([])
      addPlayersDialog.close()
      onRefresh()
    } catch (error) {
      toast.error("매물 등록에 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveParticipant = async (userId: string) => {
    const ok = await confirm({ title: "정말 제거하시겠습니까?", variant: "destructive", confirmText: "제거" })
    if (!ok) return

    try {
      await api.post(`/auctions/${auctionId}/participants/${userId}/remove`)
      toast.success("참가자가 제거되었습니다.")
      onRefresh()
    } catch (error) {
      toast.error("제거에 실패했습니다.")
    }
  }

  const handlePromoteToCaptain = async (userId: string) => {
    try {
      await api.post(`/auctions/${auctionId}/captains`, { userId })
      toast.success("팀장으로 지정되었습니다.")
      onRefresh()
    } catch (error) {
      toast.error("팀장 지정에 실패했습니다.")
    }
  }

  const handleDemoteFromCaptain = async (userId: string) => {
    const ok = await confirm({ title: "팀장 지정을 해제하시겠습니까?", confirmText: "해제" })
    if (!ok) return

    try {
      await api.post(`/auctions/${auctionId}/captains/${userId}/remove`)
      toast.success("팀장 지정이 해제되었습니다.")
      onRefresh()
    } catch (error) {
      toast.error("팀장 해제에 실패했습니다.")
    }
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      await api.patch(`/auctions/${auctionId}/settings`, editSettings)
      toast.success("설정이 저장되었습니다.")
      settingsDialog.close()
      onRefresh()
    } catch (error) {
      toast.error("설정 저장에 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Filter out members already in auction
  const participantUserIds = new Set(participants.map(p => p.userId))
  const availableMembers = clanMembers.filter(m => !participantUserIds.has(m.userId))

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-wide flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            경매 설정
          </h3>
          <div className="flex gap-2">
            <Dialog {...settingsDialog.dialogProps}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4 mr-1" />
                  설정
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>경매 설정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>팀 수</Label>
                    <Input
                      type="number"
                      min={2}
                      max={6}
                      value={editSettings.teamCount}
                      onChange={(e) => setEditSettings(prev => ({ ...prev, teamCount: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>팀장 시작 포인트</Label>
                    <Input
                      type="number"
                      min={1000}
                      step={1000}
                      value={editSettings.startingPoints}
                      onChange={(e) => setEditSettings(prev => ({ ...prev, startingPoints: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>턴 시간 제한 (초)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={120}
                      value={editSettings.turnTimeLimit}
                      onChange={(e) => setEditSettings(prev => ({ ...prev, turnTimeLimit: Number(e.target.value) }))}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    저장
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog {...addPlayersDialog.dialogProps}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground">
                  <UserPlus className="w-4 h-4 mr-1" />
                  매물 등록
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>클랜원 매물 등록</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-2 py-2">
                  {availableMembers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      등록 가능한 클랜원이 없습니다.
                    </p>
                  ) : (
                    availableMembers.map((member) => {
                      const role = (member.user?.mainRole?.toLowerCase() || "flex") as keyof typeof roleConfig
                      const config = roleConfig[role] || roleConfig.flex
                      const Icon = config.icon
                      const isSelected = selectedMembers.includes(member.userId)

                      return (
                        <div
                          key={member.userId}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => toggleMemberSelection(member.userId)}
                        >
                          <Checkbox checked={isSelected} />
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.user?.avatarUrl} />
                            <AvatarFallback className={config.bg}>
                              <Icon className={cn("w-5 h-5", config.color)} />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{member.user?.battleTag}</p>
                            <p className="text-xs text-muted-foreground capitalize">{role}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={handleAddPlayers}
                    disabled={isLoading || selectedMembers.length === 0}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {selectedMembers.length}명 등록
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Settings Display */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-muted/30 rounded p-2">
            <p className="text-muted-foreground text-xs">팀 수</p>
            <p className="font-bold text-primary">{settings.teamCount}</p>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <p className="text-muted-foreground text-xs">시작 포인트</p>
            <p className="font-bold text-primary">{settings.startingPoints.toLocaleString()}</p>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <p className="text-muted-foreground text-xs">턴 시간</p>
            <p className="font-bold text-primary">{settings.turnTimeLimit}초</p>
          </div>
        </div>

        {/* Captains */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold">팀장</span>
            <Badge variant="outline" className="text-xs">{captains.length}/{settings.teamCount}</Badge>
          </div>
          {captains.length === 0 ? (
            <p className="text-xs text-muted-foreground">팀장을 지정해주세요. 선수 목록에서 팀장 지정 가능합니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {captains.map((captain) => (
                <Badge
                  key={captain.id}
                  className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 pr-1"
                >
                  <Crown className="w-3 h-3 mr-1" />
                  {captain.user?.battleTag || "Unknown"}
                  <button
                    onClick={() => handleDemoteFromCaptain(captain.userId)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Players */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">매물 (선수)</span>
            <Badge variant="outline" className="text-xs">{players.length}명</Badge>
          </div>
          {players.length === 0 ? (
            <p className="text-xs text-muted-foreground">매물을 등록해주세요.</p>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {players.map((player) => {
                const role = (player.user?.mainRole?.toLowerCase() || "flex") as keyof typeof roleConfig
                const config = roleConfig[role] || roleConfig.flex
                const Icon = config.icon

                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 bg-muted/20 rounded text-sm group"
                  >
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", config.bg)}>
                      <Icon className={cn("w-3 h-3", config.color)} />
                    </div>
                    <span className="flex-1 truncate">{player.user?.battleTag || "Unknown"}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePromoteToCaptain(player.userId)}
                        title="팀장 지정"
                      >
                        <Crown className="w-3 h-3 text-yellow-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => handleRemoveParticipant(player.userId)}
                        title="제거"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
