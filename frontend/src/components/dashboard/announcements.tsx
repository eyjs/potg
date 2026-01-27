"use client"

import { useState } from "react"
import { Megaphone, Pin, Calendar, Plus, Pencil, Trash2, X } from "lucide-react"
import { Card, CardContent } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import { Button } from "@/common/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Textarea } from "@/common/components/ui/textarea"
import { Switch } from "@/common/components/ui/switch"
import { Label } from "@/common/components/ui/label"
import api from "@/lib/api"
import { toast } from "sonner"
import { useConfirm } from "@/common/components/confirm-dialog"

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
  isPinned?: boolean
  author?: {
    battleTag: string
  }
}

interface AnnouncementsProps {
  announcements: Announcement[]
  clanId?: string
  canManage?: boolean
  onRefresh?: () => void
}

export function Announcements({ announcements, clanId, canManage = false, onRefresh }: AnnouncementsProps) {
  const confirm = useConfirm()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: "", content: "", isPinned: false })

  const handleCreate = async () => {
    if (!clanId || !form.title.trim() || !form.content.trim()) return
    try {
      await api.post(`/clans/${clanId}/announcements`, form)
      toast.success("공지사항이 등록되었습니다.")
      setIsCreateOpen(false)
      setForm({ title: "", content: "", isPinned: false })
      onRefresh?.()
    } catch {
      toast.error("등록 실패")
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      await api.patch(`/clans/announcements/${id}`, form)
      toast.success("공지사항이 수정되었습니다.")
      setEditingId(null)
      setForm({ title: "", content: "", isPinned: false })
      onRefresh?.()
    } catch {
      toast.error("수정 실패")
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "정말 삭제하시겠습니까?", variant: "destructive", confirmText: "삭제" })
    if (!ok) return
    try {
      await api.post(`/clans/announcements/${id}/delete`)
      toast.success("삭제되었습니다.")
      onRefresh?.()
    } catch {
      toast.error("삭제 실패")
    }
  }

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setForm({
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.isPinned || false,
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" />
          <span className="text-primary">공지사항</span>
        </h2>

        {canManage && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> 작성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>공지사항 작성</DialogTitle>
                <DialogDescription className="sr-only">클랜 공지사항을 작성합니다</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>제목</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="공지 제목"
                  />
                </div>
                <div>
                  <Label>내용</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="공지 내용을 입력하세요"
                    rows={4}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isPinned}
                    onCheckedChange={(checked) => setForm({ ...form, isPinned: checked })}
                  />
                  <Label>상단 고정</Label>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  등록
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-border/50 rounded-lg text-center">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
            <p className="text-muted-foreground text-sm">공지사항이 없습니다</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="border-2 border-primary/30 bg-card hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-4">
                {editingId === announcement.id ? (
                  <div className="space-y-3">
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                    <Textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.isPinned}
                        onCheckedChange={(checked) => setForm({ ...form, isPinned: checked })}
                      />
                      <Label className="text-sm">상단 고정</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(announcement.id)}>
                        저장
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <h3 className="font-bold text-foreground uppercase italic text-sm md:text-base truncate">
                          {announcement.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {announcement.isPinned && (
                          <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                            고정
                          </Badge>
                        )}
                        {canManage && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(announcement)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(announcement.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(announcement.createdAt).toLocaleDateString("ko-KR")}</span>
                      {announcement.author && (
                        <span className="ml-2">• {announcement.author.battleTag}</span>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  )
}
