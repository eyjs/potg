"use client"

import { useState, useEffect } from "react"
import { Trophy, DollarSign, AlertTriangle, Plus, Trash2, Crown } from "lucide-react"
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
          // Map to ensure battleTag exists and extract user info
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

  const renderEntries = (list: HallOfFameEntry[], type: HallOfFameType) => {
    const isWanted = type === "WANTED"

    if (list.length === 0) {
      return (
        <div className="py-8 text-center">
          <div className={cn(
            "inline-flex p-3 rounded-full mb-3",
            isWanted ? "bg-destructive/20" : "bg-primary/20"
          )}>
            {type === "MVP" && <Trophy className="w-5 h-5 text-primary" />}
            {type === "DONOR" && <DollarSign className="w-5 h-5 text-primary" />}
            {type === "WANTED" && <AlertTriangle className="w-5 h-5 text-destructive" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {type === "MVP" && "이번 달 MVP를 집계중입니다"}
            {type === "DONOR" && "등록된 기부자가 없습니다"}
            {type === "WANTED" && "현상수배가 없습니다"}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {list.slice(0, 5).map((entry, index) => (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              isWanted
                ? "bg-destructive/10 border-destructive/30"
                : "bg-primary/10 border-primary/30"
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {index === 0 && !isWanted ? (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-primary" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <span className={cn(
                    "text-sm font-bold",
                    isWanted ? "text-destructive" : "text-primary"
                  )}>
                    {index + 1}
                  </span>
                </div>
              )}
              <Avatar className="w-9 h-9">
                <AvatarImage src={entry.user?.avatarUrl || entry.imageUrl} />
                <AvatarFallback className="bg-muted text-xs font-bold">
                  {(entry.user?.battleTag || entry.title || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-foreground text-sm truncate block">
                  {entry.user?.battleTag || entry.title}
                </span>
                {entry.description && (
                  <span className="text-xs text-muted-foreground truncate block">
                    {entry.description}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {entry.amount > 0 && (
                <span className={cn(
                  "text-xs font-bold px-2 py-1 rounded",
                  isWanted ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                )}>
                  {entry.amount.toLocaleString()}{type === "DONOR" ? "원" : "P"}
                </span>
              )}
              {canManage && type !== "MVP" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderCreateDialog = (type: "DONOR" | "WANTED") => {
    const isWanted = type === "WANTED"

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className={cn(
              "w-full h-11 font-bold",
              isWanted
                ? "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"
                : "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
            )}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isWanted ? "수배 등록" : "기부자 등록"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isWanted ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <DollarSign className="w-5 h-5 text-primary" />
              )}
              {isWanted ? "수배 등록" : "기부자 등록"}
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
              <Label>{isWanted ? "사유" : "메모 (선택)"}</Label>
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
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <h2 className="text-lg font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          명예의 <span className="text-primary">전당</span>
        </h2>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as HallOfFameType); resetForm() }}>
          <TabsList className="grid w-full grid-cols-3 h-10 bg-muted/50">
            <TabsTrigger value="MVP" className="text-xs font-bold gap-1">
              <Trophy className="w-4 h-4" /> MVP
            </TabsTrigger>
            <TabsTrigger value="DONOR" className="text-xs font-bold gap-1">
              <DollarSign className="w-4 h-4" /> 기부
            </TabsTrigger>
            <TabsTrigger value="WANTED" className="text-xs font-bold gap-1">
              <AlertTriangle className="w-4 h-4" /> 수배
            </TabsTrigger>
          </TabsList>

          <TabsContent value="MVP" className="mt-3">
            {renderEntries(mvpEntries, "MVP")}
          </TabsContent>

          <TabsContent value="DONOR" className="mt-3 space-y-3">
            {renderEntries(donorEntries, "DONOR")}
            {canManage && renderCreateDialog("DONOR")}
          </TabsContent>

          <TabsContent value="WANTED" className="mt-3 space-y-3">
            {renderEntries(wantedEntries, "WANTED")}
            {canManage && renderCreateDialog("WANTED")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
