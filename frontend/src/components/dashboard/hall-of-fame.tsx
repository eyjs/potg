"use client"

import { useState, useEffect } from "react"
import { Trophy, DollarSign, AlertTriangle, Plus, Trash2, Crosshair } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { Button } from "@/common/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type HallOfFameType = "MVP" | "DONOR" | "WANTED"

interface HallOfFameEntry {
  id: string
  type: HallOfFameType
  title: string
  description?: string
  amount: number
  imageUrl?: string
  user?: {
    id?: string
    battleTag: string
    avatarUrl?: string
  }
}

interface ClanMember {
  id: string
  battleTag: string
  avatarUrl?: string
}

interface HallOfFameProps {
  entries: HallOfFameEntry[]
  clanId?: string
  canManage?: boolean
  onRefresh?: () => void
}

const RANK_STYLES = [
  "bg-yellow-500 text-yellow-950",   // 1st - Gold
  "bg-gray-400 text-gray-950",       // 2nd - Silver
  "bg-amber-600 text-amber-950",     // 3rd - Bronze
]

export function HallOfFame({ entries, clanId, canManage = false, onRefresh }: HallOfFameProps) {
  const [activeTab, setActiveTab] = useState<HallOfFameType>("MVP")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isDialogOpen && clanId && clanMembers.length === 0) {
      api.get(`/clans/${clanId}/members`)
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : []
          const members = data.map((m: { userId: string; user?: { battleTag?: string; avatarUrl?: string } }) => ({
            id: m.userId,
            battleTag: m.user?.battleTag || "Unknown",
            avatarUrl: m.user?.avatarUrl
          }))
          setClanMembers(members)
        })
        .catch(console.error)
    }
  }, [isDialogOpen, clanId, clanMembers.length])

  const mvpEntries = entries.filter((e) => e.type === "MVP")
  const donorEntries = entries.filter((e) => e.type === "DONOR").sort((a, b) => b.amount - a.amount)
  const wantedEntries = entries.filter((e) => e.type === "WANTED")

  const handleCreate = async () => {
    if (!clanId || !selectedMemberId) {
      toast.error("클랜원을 선택해주세요")
      return
    }

    if (activeTab === "DONOR" && (!amount || Number(amount) <= 0)) {
      toast.error("기부 금액을 입력해주세요")
      return
    }

    setIsSubmitting(true)
    try {
      const selectedMember = clanMembers.find((m) => m.id === selectedMemberId)
      const battleTag = selectedMember?.battleTag || "Unknown"
      const title = activeTab === "DONOR" ? `${battleTag} 기부` : `${battleTag} 수배`

      await api.post(`/clans/${clanId}/hall-of-fame`, {
        type: activeTab,
        userId: selectedMemberId,
        title,
        amount: activeTab === "DONOR" ? Number(amount) : 0,
        description: reason || undefined,
      })
      toast.success("등록되었습니다")
      setIsDialogOpen(false)
      resetForm()
      onRefresh?.()
    } catch {
      toast.error("등록 실패")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.post(`/clans/hall-of-fame/${id}/delete`)
      toast.success("삭제되었습니다")
      onRefresh?.()
    } catch {
      toast.error("삭제 실패")
    }
  }

  const resetForm = () => {
    setSelectedMemberId("")
    setAmount("")
    setReason("")
  }

  const renderRankBadge = (index: number, isWanted: boolean) => {
    if (isWanted) {
      return (
        <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
          <Crosshair className="w-4 h-4 text-destructive" />
        </div>
      )
    }

    const medalStyle = RANK_STYLES[index]
    if (medalStyle) {
      return (
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0", medalStyle)}>
          {index + 1}
        </div>
      )
    }

    return (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
      </div>
    )
  }

  const renderEntries = (list: HallOfFameEntry[], type: HallOfFameType) => {
    const isWanted = type === "WANTED"

    if (list.length === 0) {
      return (
        <div className="py-10 text-center">
          <div className={cn(
            "inline-flex p-4 rounded-full mb-3",
            isWanted ? "bg-destructive/10" : "bg-muted/50"
          )}>
            {type === "MVP" && <Trophy className="w-6 h-6 text-muted-foreground" />}
            {type === "DONOR" && <DollarSign className="w-6 h-6 text-muted-foreground" />}
            {type === "WANTED" && <Crosshair className="w-6 h-6 text-destructive/50" />}
          </div>
          <p className="text-sm text-muted-foreground font-bold">
            {type === "MVP" && "이번 달 MVP를 집계중입니다"}
            {type === "DONOR" && "등록된 기부자가 없습니다"}
            {type === "WANTED" && "현상수배 대상이 없습니다"}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-1.5">
        {list.slice(0, 5).map((entry, index) => {
          const isTop3 = index < 3 && !isWanted

          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg transition-colors group",
                isWanted
                  ? "bg-destructive/5 hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                  : isTop3
                    ? "bg-accent/5 border border-accent/20 hover:bg-accent/10"
                    : "bg-muted/20 hover:bg-muted/40 border border-transparent"
              )}
            >
              {renderRankBadge(index, isWanted)}

              <Avatar className="w-10 h-10 border-2 border-background">
                <AvatarImage src={entry.user?.avatarUrl || entry.imageUrl} />
                <AvatarFallback className={cn(
                  "text-xs font-black",
                  isWanted ? "bg-destructive/20 text-destructive" : "bg-muted"
                )}>
                  {(entry.user?.battleTag || entry.title || "?")[0]}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className={cn(
                  "font-bold text-sm truncate",
                  isWanted ? "text-destructive" : "text-foreground"
                )}>
                  {entry.user?.battleTag || entry.title}
                </p>
                {entry.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {entry.amount > 0 && (
                  <span className={cn(
                    "text-sm font-black tabular-nums",
                    isWanted ? "text-destructive" : "text-primary"
                  )}>
                    {entry.amount.toLocaleString()}
                    <span className="text-xs font-bold ml-0.5">
                      {type === "DONOR" ? "원" : "P"}
                    </span>
                  </span>
                )}
                {canManage && type !== "MVP" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderCreateDialog = (type: "DONOR" | "WANTED") => {
    const isWanted = type === "WANTED"

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className={cn(
              "w-full h-9 font-bold text-xs",
              isWanted
                ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            )}
            variant="outline"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {isWanted ? "현상수배 등록" : "기부자 등록"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {isWanted ? (
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Crosshair className="w-4 h-4 text-destructive" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
              )}
              {isWanted ? "현상수배 등록" : "기부자 등록"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isWanted ? "클랜원을 현상수배에 등록합니다" : "클랜원을 기부자로 등록합니다"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>클랜원 선택</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="클랜원을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {clanMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="text-xs">{(member.battleTag || "?")[0]}</AvatarFallback>
                        </Avatar>
                        {member.battleTag}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isWanted && (
              <div className="space-y-2">
                <Label>기부 금액 (원)</Label>
                <Input
                  type="number"
                  placeholder="금액 입력"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{isWanted ? "수배 사유" : "메모 (선택)"}</Label>
              <Input
                placeholder={isWanted ? "예: 내전 불참 3회" : "예: 서버비 후원"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-11"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className={cn(
                "w-full h-11 font-bold",
                isWanted
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isSubmitting ? "등록 중..." : "등록하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card className="border border-border/50 bg-card overflow-hidden">
      <CardHeader className="pb-0 pt-4 px-4">
        <h2 className="text-base font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          명예의 <span className="text-primary">전당</span>
        </h2>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as HallOfFameType); resetForm() }}>
          <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/30 mb-3">
            <TabsTrigger value="MVP" className="text-xs font-black gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="w-3.5 h-3.5" /> MVP
            </TabsTrigger>
            <TabsTrigger value="DONOR" className="text-xs font-black gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="w-3.5 h-3.5" /> 기부
            </TabsTrigger>
            <TabsTrigger value="WANTED" className="text-xs font-black gap-1.5 data-[state=active]:bg-destructive data-[state=active]:text-white">
              <Crosshair className="w-3.5 h-3.5" /> 현상수배
            </TabsTrigger>
          </TabsList>

          <TabsContent value="MVP" className="mt-0">
            {renderEntries(mvpEntries, "MVP")}
          </TabsContent>

          <TabsContent value="DONOR" className="mt-0 space-y-3">
            {renderEntries(donorEntries, "DONOR")}
            {canManage && renderCreateDialog("DONOR")}
          </TabsContent>

          <TabsContent value="WANTED" className="mt-0 space-y-3">
            {renderEntries(wantedEntries, "WANTED")}
            {canManage && renderCreateDialog("WANTED")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
