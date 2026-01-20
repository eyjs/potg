"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Textarea } from "@/common/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { Switch } from "@/common/components/ui/switch"
import type { Hero } from "@/app/gallery/page"

interface CreateHeroModalProps {
  onCreateHero: (hero: Omit<Hero, "id" | "registerId">) => void
}

export function CreateHeroModal({ onCreateHero }: CreateHeroModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    age: 25,
    gender: 'FEMALE' as 'MALE' | 'FEMALE',
    location: "",
    job: "",
    education: "",
    height: undefined as number | undefined,
    mbti: "",
    status: "available" as Hero["status"],
    bio: "",
    idealType: "",
    smoking: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    onCreateHero({
      ...formData,
      height: formData.height || undefined,
    })

    setFormData({
      name: "",
      age: 25,
      gender: 'FEMALE',
      location: "",
      job: "",
      education: "",
      height: undefined,
      mbti: "",
      status: "available",
      bio: "",
      idealType: "",
      smoking: false,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wide rounded-md">
          <Plus className="w-4 h-4 mr-2" />
          <span>소개팅 등록</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold italic uppercase tracking-wide text-foreground">
            새 소개팅 등록
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">상대방에게 보여줄 정보를 입력하세요</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">이름 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">성별 *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value as 'MALE' | 'FEMALE' }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="MALE">남성</SelectItem>
                  <SelectItem value="FEMALE">여성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">나이 *</Label>
              <Input
                type="number"
                min={18}
                max={99}
                value={formData.age}
                onChange={(e) => setFormData((prev) => ({ ...prev, age: Number(e.target.value) }))}
                className="bg-input border-border text-foreground"
              />
            </div>
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
                placeholder="예: 회사원, 프리랜서"
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">학력</Label>
              <Input
                value={formData.education}
                onChange={(e) => setFormData((prev) => ({ ...prev, education: e.target.value }))}
                placeholder="예: 대학교 졸업"
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">키 (cm)</Label>
              <Input
                type="number"
                min={140}
                max={220}
                value={formData.height || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="예: 175"
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="available">만남 가능</SelectItem>
                  <SelectItem value="talking">소개팅 중</SelectItem>
                  <SelectItem value="taken">매칭 완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-8">
              <Label className="text-foreground">흡연 여부</Label>
              <Switch
                checked={formData.smoking}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, smoking: checked }))}
              />
            </div>
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

          <div className="space-y-2">
            <Label className="text-foreground">원하는 상대 조건</Label>
            <Textarea
              value={formData.idealType}
              onChange={(e) => setFormData((prev) => ({ ...prev, idealType: e.target.value }))}
              placeholder="예: 성실하고 유머 감각 있는 분, 운동을 좋아하시는 분 등"
              className="bg-input border-border text-foreground"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-black font-bold"
            >
              등록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}