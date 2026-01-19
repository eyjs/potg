"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Hero } from "@/app/gallery/page"

interface CreateHeroModalProps {
  onCreateHero: (hero: Omit<Hero, "id">) => void
}

export function CreateHeroModal({ onCreateHero }: CreateHeroModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    age: 25,
    location: "",
    job: "",
    mbti: "",
    status: "available" as Hero["status"],
    gameRole: "dps" as Hero["gameRole"],
    tier: "",
    mostHeroes: "",
    bio: "",
    smoking: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    onCreateHero({
      ...formData,
      mostHeroes: formData.mostHeroes
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean),
    })

    setFormData({
      name: "",
      age: 25,
      location: "",
      job: "",
      mbti: "",
      status: "available",
      gameRole: "dps",
      tier: "",
      mostHeroes: "",
      bio: "",
      smoking: false,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wide">
          <Plus className="w-4 h-4 mr-2" />
          <span>매물 등록</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold italic uppercase tracking-wide text-foreground">
            새 매물 등록
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">소개팅 매물 정보를 입력하세요</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">이름</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">나이</Label>
              <Input
                type="number"
                min={18}
                max={99}
                value={formData.age}
                onChange={(e) => setFormData((prev) => ({ ...prev, age: Number(e.target.value) }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">거주지</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="예: 서울 강남"
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">직업</Label>
              <Input
                value={formData.job}
                onChange={(e) => setFormData((prev) => ({ ...prev, job: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">MBTI</Label>
              <Input
                value={formData.mbti}
                onChange={(e) => setFormData((prev) => ({ ...prev, mbti: e.target.value.toUpperCase() }))}
                placeholder="예: ENFP"
                maxLength={4}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">티어</Label>
              <Input
                value={formData.tier}
                onChange={(e) => setFormData((prev) => ({ ...prev, tier: e.target.value }))}
                placeholder="예: 다이아몬드"
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">포지션</Label>
              <Select
                value={formData.gameRole}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, gameRole: value as Hero["gameRole"] }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="tank">탱커</SelectItem>
                  <SelectItem value="dps">딜러</SelectItem>
                  <SelectItem value="support">힐러</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">상태</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as Hero["status"] }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="available">판매중</SelectItem>
                  <SelectItem value="talking">썸</SelectItem>
                  <SelectItem value="taken">품절</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">모스트 영웅 (콤마로 구분)</Label>
            <Input
              value={formData.mostHeroes}
              onChange={(e) => setFormData((prev) => ({ ...prev, mostHeroes: e.target.value }))}
              placeholder="예: 겐지, 트레이서, 솜브라"
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">소개글</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="간단한 자기소개를 작성하세요"
              className="bg-input border-border text-foreground"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-foreground">흡연 여부</Label>
            <Switch
              checked={formData.smoking}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, smoking: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              type="submit"
              className="skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <span>등록</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
