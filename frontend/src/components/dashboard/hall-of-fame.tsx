"use client"

import { useState } from "react"
import { Trophy, DollarSign, AlertTriangle, Plus, Pencil, Trash2, Crown, Star } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { Button } from "@/common/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Textarea } from "@/common/components/ui/textarea"
import { Label } from "@/common/components/ui/label"
import api from "@/lib/api"
import { toast } from "sonner"

type HallOfFameType = "MVP" | "DONOR" | "WANTED"

interface HallOfFameEntry {
  id: string
  type: HallOfFameType
  title: string
  description?: string
  amount: number
  imageUrl?: string
  user?: {
    battleTag: string
    avatarUrl?: string
  }
}

interface HallOfFameProps {
  entries: HallOfFameEntry[]
  clanId?: string
  canManage?: boolean
  onRefresh?: () => void
}

export function HallOfFame({ entries, clanId, canManage = false, onRefresh }: HallOfFameProps) {
  const [activeTab, setActiveTab] = useState<HallOfFameType>("MVP")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState({
    type: "MVP" as HallOfFameType,
    title: "",
    description: "",
    amount: 0,
  })

  const mvpEntries = entries.filter((e) => e.type === "MVP")
  const donorEntries = entries.filter((e) => e.type === "DONOR")
  const wantedEntries = entries.filter((e) => e.type === "WANTED")

  const handleCreate = async () => {
    if (!clanId || !form.title.trim()) return
    try {
      await api.post(`/clans/${clanId}/hall-of-fame`, form)
      toast.success("등록되었습니다.")
      setIsCreateOpen(false)
      setForm({ type: "MVP", title: "", description: "", amount: 0 })
      onRefresh?.()
    } catch {
      toast.error("등록 실패")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.post(`/clans/hall-of-fame/${id}/delete`)
      toast.success("삭제되었습니다.")
      onRefresh?.()
    } catch {
      toast.error("삭제 실패")
    }
  }

  const renderEntries = (list: HallOfFameEntry[], type: HallOfFameType) => {
    const getIcon = () => {
      switch (type) {
        case "MVP":
          return <Trophy className="w-5 h-5 text-accent" />
        case "DONOR":
          return <DollarSign className="w-5 h-5 text-primary" />
        case "WANTED":
          return <AlertTriangle className="w-5 h-5 text-destructive" />
      }
    }

    const getColor = () => {
      switch (type) {
        case "MVP":
          return "text-accent"
        case "DONOR":
          return "text-primary"
        case "WANTED":
          return "text-destructive"
      }
    }

    const getUnit = () => {
      switch (type) {
        case "MVP":
          return "P"
        case "DONOR":
          return "원"
        case "WANTED":
          return "P"
      }
    }

    if (list.length === 0) {
      return (
        <div className="p-6 text-center">
          {getIcon()}
          <p className="text-xs text-muted-foreground mt-2">
            {type === "MVP" && "이달의 MVP를 집계중입니다"}
            {type === "DONOR" && "기부자를 준비중입니다"}
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
            className="flex items-center gap-3 p-2 bg-card/50 rounded-lg border border-border/50"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {index === 0 && type !== "WANTED" ? (
                <Crown className={`w-5 h-5 ${getColor()}`} />
              ) : (
                <span className={`text-lg font-black italic ${getColor()} w-6 text-center`}>
                  #{index + 1}
                </span>
              )}
              <Avatar className="w-8 h-8">
                <AvatarImage src={entry.user?.avatarUrl || entry.imageUrl} />
                <AvatarFallback className="bg-muted text-xs">
                  {entry.title[0]}
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
                <div className="flex items-center gap-1">
                  <Star className={`w-3 h-3 ${getColor()}`} />
                  <span className={`text-xs font-bold ${getColor()}`}>
                    {entry.amount.toLocaleString()}{getUnit()}
                  </span>
                </div>
              )}
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            명예의 <span className="text-accent">전당</span>
          </h2>
          {canManage && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>명예의 전당 등록</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>유형</Label>
                    <select
                      className="w-full p-2 rounded-md border border-border bg-background"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as HallOfFameType })}
                    >
                      <option value="MVP">MVP</option>
                      <option value="DONOR">기부자</option>
                      <option value="WANTED">현상수배</option>
                    </select>
                  </div>
                  <div>
                    <Label>제목/이름</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="이름 또는 제목"
                    />
                  </div>
                  <div>
                    <Label>설명 (선택)</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="설명"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>
                      {form.type === "DONOR" ? "기부금액 (원)" : "포인트"}
                    </Label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full">
                    등록
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HallOfFameType)}>
          <TabsList className="grid w-full grid-cols-3 h-8 bg-muted/30">
            <TabsTrigger value="MVP" className="text-xs">
              <Trophy className="w-3 h-3 mr-1" /> MVP
            </TabsTrigger>
            <TabsTrigger value="DONOR" className="text-xs">
              <DollarSign className="w-3 h-3 mr-1" /> 기부
            </TabsTrigger>
            <TabsTrigger value="WANTED" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" /> 수배
            </TabsTrigger>
          </TabsList>
          <TabsContent value="MVP" className="mt-3">
            {renderEntries(mvpEntries, "MVP")}
          </TabsContent>
          <TabsContent value="DONOR" className="mt-3">
            {renderEntries(donorEntries, "DONOR")}
          </TabsContent>
          <TabsContent value="WANTED" className="mt-3">
            {renderEntries(wantedEntries, "WANTED")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
