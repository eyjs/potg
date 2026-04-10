"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Textarea } from "@/common/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { Switch } from "@/common/components/ui/switch"
import { Header } from "@/common/layouts/header"
import { AuthGuard } from "@/common/components/auth-guard"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { handleApiError } from "@/lib/api-error"
import { ImageUploader } from "@/components/image-uploader"

interface FormData {
  name: string
  gender: "MALE" | "FEMALE"
  age: number
  location: string
  desiredLocation: string
  job: string
  education: string
  height: number | undefined
  mbti: string
  smoking: boolean
  description: string
  idealType: string
  photos: string[]
  contactInfo: string
}

export default function GalleryRegisterPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState<FormData>({
    name: "",
    gender: "FEMALE",
    age: 25,
    location: "",
    desiredLocation: "",
    job: "",
    education: "",
    height: undefined,
    mbti: "",
    smoking: false,
    description: "",
    idealType: "",
    photos: [],
    contactInfo: "",
  })

  const canSubmit =
    form.name.trim() &&
    form.age >= 18 &&
    form.location.trim() &&
    form.desiredLocation.trim() &&
    form.job.trim() &&
    form.description.trim() &&
    form.contactInfo.trim()

  const handleSubmit = async () => {
    if (!user?.clanId) {
      toast.error("클랜에 가입해야 등록할 수 있습니다.")
      return
    }

    if (!canSubmit) {
      toast.error("필수 항목을 모두 입력해주세요.")
      return
    }

    try {
      setIsSubmitting(true)
      await api.post("/blind-date/listings", {
        clanId: user.clanId,
        name: form.name,
        age: form.age,
        gender: form.gender,
        location: form.location,
        desiredLocation: form.desiredLocation,
        job: form.job,
        description: form.description,
        idealType: form.idealType || undefined,
        mbti: form.mbti || undefined,
        education: form.education || undefined,
        height: form.height || undefined,
        smoking: form.smoking,
        photos: form.photos.length > 0 ? form.photos : undefined,
        contactInfo: form.contactInfo,
      })
      toast.success("소개팅 매물이 등록되었습니다.")
      router.push("/gallery")
    } catch (error) {
      handleApiError(error, "매물 등록에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container max-w-lg px-4 py-6 space-y-6">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/gallery")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            목록으로
          </Button>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-extrabold italic uppercase tracking-wide text-foreground">
              소개팅 <span className="text-primary">등록</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">상대방에게 보여줄 정보를 입력하세요</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">이름 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-input border-border text-foreground"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">성별 *</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm((p) => ({ ...p, gender: v as "MALE" | "FEMALE" }))}
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
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: Number(e.target.value) }))}
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">MBTI</Label>
                <Input
                  value={form.mbti}
                  onChange={(e) => setForm((p) => ({ ...p, mbti: e.target.value.toUpperCase() }))}
                  placeholder="예: ENFP"
                  maxLength={4}
                  className="bg-input border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">거주지 *</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="예: 서울 강남"
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">원하는 상대 지역 *</Label>
                <Input
                  value={form.desiredLocation}
                  onChange={(e) => setForm((p) => ({ ...p, desiredLocation: e.target.value }))}
                  placeholder="예: 서울, 경기"
                  className="bg-input border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">직업 *</Label>
                <Input
                  value={form.job}
                  onChange={(e) => setForm((p) => ({ ...p, job: e.target.value }))}
                  placeholder="예: 회사원, 프리랜서"
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">키 (cm)</Label>
                <Input
                  type="number"
                  min={140}
                  max={220}
                  value={form.height || ""}
                  onChange={(e) => setForm((p) => ({ ...p, height: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="예: 175"
                  className="bg-input border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">학력</Label>
                <Input
                  value={form.education}
                  onChange={(e) => setForm((p) => ({ ...p, education: e.target.value }))}
                  placeholder="예: 대학교 졸업"
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center justify-between w-full">
                  <Label className="text-foreground">흡연 여부</Label>
                  <Switch
                    checked={form.smoking}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, smoking: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">사진 (최대 5장)</Label>
              <ImageUploader
                value={form.photos}
                onChange={(photos) => setForm((p) => ({ ...p, photos }))}
                maxCount={5}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">소개글 *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="간단한 자기소개를 작성하세요"
                className="bg-input border-border text-foreground"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">이상형 (선택)</Label>
              <Textarea
                value={form.idealType}
                onChange={(e) => setForm((p) => ({ ...p, idealType: e.target.value }))}
                placeholder="예: 성실하고 유머 감각 있는 분"
                className="bg-input border-border text-foreground"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">연락 방법 *</Label>
              <Input
                value={form.contactInfo}
                onChange={(e) => setForm((p) => ({ ...p, contactInfo: e.target.value }))}
                placeholder="예: 카카오톡 ID, 전화번호 등"
                className="bg-input border-border text-foreground"
              />
              <p className="text-xs text-primary font-semibold">갤러리 상세 페이지에서 바로 노출됩니다.</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => router.push("/gallery")} className="flex-1">
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold"
              >
                {isSubmitting ? "등록 중..." : "등록하기"}
                {!isSubmitting && <Check className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
