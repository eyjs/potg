"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { handleApiError } from "@/lib/api-error"
import type { MinEducation } from "@/modules/blind-date/types"
import { EDUCATION_LABELS } from "@/modules/blind-date/types"
import { ImageUploader } from "@/components/image-uploader"

interface Step1Data {
  name: string
  gender: "MALE" | "FEMALE"
  age: number
  location: string
  job: string
  education: string
  height: number | undefined
  mbti: string
  smoking: boolean
  bio: string
  idealType: string
  photos: string[]
}

interface Step2Data {
  minAge: string
  maxAge: string
  preferredGender: string
  minEducation: string
  minHeight: string
  maxHeight: string
  preferredLocations: string
  preferredJobs: string
}

export default function GalleryRegisterPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [step1, setStep1] = useState<Step1Data>({
    name: "",
    gender: "FEMALE",
    age: 25,
    location: "",
    job: "",
    education: "",
    height: undefined,
    mbti: "",
    smoking: false,
    bio: "",
    idealType: "",
    photos: [],
  })

  const [step2, setStep2] = useState<Step2Data>({
    minAge: "",
    maxAge: "",
    preferredGender: "",
    minEducation: "",
    minHeight: "",
    maxHeight: "",
    preferredLocations: "",
    preferredJobs: "",
  })

  const canProceed = step1.name.trim() && step1.age >= 18

  const handleNext = () => {
    if (!canProceed) {
      toast.error("이름과 나이(18세 이상)는 필수입니다.")
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!user?.clanId) {
      toast.error("클랜에 가입해야 등록할 수 있습니다.")
      return
    }

    // Build preference object (only if any field is filled)
    const hasPreference = Object.values(step2).some((v) => v !== "")
    let preference: Record<string, unknown> | undefined

    if (hasPreference) {
      preference = {}
      if (step2.minAge) preference.minAge = Number(step2.minAge)
      if (step2.maxAge) preference.maxAge = Number(step2.maxAge)
      if (step2.preferredGender) preference.preferredGender = step2.preferredGender
      if (step2.minEducation) preference.minEducation = step2.minEducation
      if (step2.minHeight) preference.minHeight = Number(step2.minHeight)
      if (step2.maxHeight) preference.maxHeight = Number(step2.maxHeight)
      if (step2.preferredLocations.trim()) {
        preference.preferredLocations = step2.preferredLocations.split(",").map((s) => s.trim()).filter(Boolean)
      }
      if (step2.preferredJobs.trim()) {
        preference.preferredJobs = step2.preferredJobs.split(",").map((s) => s.trim()).filter(Boolean)
      }
    }

    try {
      setIsSubmitting(true)
      await api.post("/blind-date/listings", {
        clanId: user.clanId,
        name: step1.name,
        age: step1.age,
        gender: step1.gender,
        location: step1.location,
        job: step1.job,
        description: step1.bio,
        idealType: step1.idealType,
        mbti: step1.mbti,
        education: step1.education,
        height: step1.height || undefined,
        smoking: step1.smoking,
        photos: step1.photos,
        ...(preference ? { preference } : {}),
      })
      toast.success("소개팅 매물이 등록되었습니다.")
      router.push("/gallery")
    } catch (error) {
      handleApiError(error, "매물 등록에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const educationOptions = Object.entries(EDUCATION_LABELS) as [MinEducation, string][]

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

          {/* Step Indicator */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold",
              step === 1 ? "bg-primary text-black" : "bg-muted text-muted-foreground"
            )}>
              {step > 1 ? <Check className="w-4 h-4" /> : <span>1</span>}
              <span>기본 정보</span>
            </div>
            <div className="h-px w-6 bg-border" />
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold",
              step === 2 ? "bg-primary text-black" : "bg-muted text-muted-foreground"
            )}>
              <span>2</span>
              <span>희망 조건</span>
            </div>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">이름 *</Label>
                  <Input
                    value={step1.name}
                    onChange={(e) => setStep1((p) => ({ ...p, name: e.target.value }))}
                    className="bg-input border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">성별 *</Label>
                  <Select
                    value={step1.gender}
                    onValueChange={(v) => setStep1((p) => ({ ...p, gender: v as "MALE" | "FEMALE" }))}
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
                    value={step1.age}
                    onChange={(e) => setStep1((p) => ({ ...p, age: Number(e.target.value) }))}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">MBTI</Label>
                  <Input
                    value={step1.mbti}
                    onChange={(e) => setStep1((p) => ({ ...p, mbti: e.target.value.toUpperCase() }))}
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
                    value={step1.location}
                    onChange={(e) => setStep1((p) => ({ ...p, location: e.target.value }))}
                    placeholder="예: 서울 강남"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">직업</Label>
                  <Input
                    value={step1.job}
                    onChange={(e) => setStep1((p) => ({ ...p, job: e.target.value }))}
                    placeholder="예: 회사원, 프리랜서"
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">학력</Label>
                  <Input
                    value={step1.education}
                    onChange={(e) => setStep1((p) => ({ ...p, education: e.target.value }))}
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
                    value={step1.height || ""}
                    onChange={(e) => setStep1((p) => ({ ...p, height: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="예: 175"
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-foreground">흡연 여부</Label>
                <Switch
                  checked={step1.smoking}
                  onCheckedChange={(checked) => setStep1((p) => ({ ...p, smoking: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">사진 (최대 5장)</Label>
                <ImageUploader
                  value={step1.photos}
                  onChange={(photos) => setStep1((p) => ({ ...p, photos }))}
                  maxCount={5}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">소개글</Label>
                <Textarea
                  value={step1.bio}
                  onChange={(e) => setStep1((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="간단한 자기소개를 작성하세요"
                  className="bg-input border-border text-foreground"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">원하는 상대 조건 (자유 텍스트)</Label>
                <Textarea
                  value={step1.idealType}
                  onChange={(e) => setStep1((p) => ({ ...p, idealType: e.target.value }))}
                  placeholder="예: 성실하고 유머 감각 있는 분, 운동을 좋아하시는 분 등"
                  className="bg-input border-border text-foreground"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => router.push("/gallery")} className="flex-1">
                  취소
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold"
                >
                  다음
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded border border-border/50 text-sm text-muted-foreground">
                희망 조건은 모두 선택사항입니다. 입력하지 않아도 등록이 가능합니다.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">최소 나이</Label>
                  <Input
                    type="number"
                    min={18}
                    max={99}
                    value={step2.minAge}
                    onChange={(e) => setStep2((p) => ({ ...p, minAge: e.target.value }))}
                    placeholder="예: 20"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">최대 나이</Label>
                  <Input
                    type="number"
                    min={18}
                    max={99}
                    value={step2.maxAge}
                    onChange={(e) => setStep2((p) => ({ ...p, maxAge: e.target.value }))}
                    placeholder="예: 35"
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">선호 성별</Label>
                  <Select
                    value={step2.preferredGender}
                    onValueChange={(v) => setStep2((p) => ({ ...p, preferredGender: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="선택 안 함" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="__none__">선택 안 함</SelectItem>
                      <SelectItem value="MALE">남성</SelectItem>
                      <SelectItem value="FEMALE">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">최소 학력</Label>
                  <Select
                    value={step2.minEducation}
                    onValueChange={(v) => setStep2((p) => ({ ...p, minEducation: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="선택 안 함" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="__none__">선택 안 함</SelectItem>
                      {educationOptions.map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">최소 키 (cm)</Label>
                  <Input
                    type="number"
                    min={100}
                    max={250}
                    value={step2.minHeight}
                    onChange={(e) => setStep2((p) => ({ ...p, minHeight: e.target.value }))}
                    placeholder="예: 160"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">최대 키 (cm)</Label>
                  <Input
                    type="number"
                    min={100}
                    max={250}
                    value={step2.maxHeight}
                    onChange={(e) => setStep2((p) => ({ ...p, maxHeight: e.target.value }))}
                    placeholder="예: 185"
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">선호 지역</Label>
                <Input
                  value={step2.preferredLocations}
                  onChange={(e) => setStep2((p) => ({ ...p, preferredLocations: e.target.value }))}
                  placeholder="쉼표로 구분 (예: 서울, 경기, 인천)"
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">선호 직업</Label>
                <Input
                  value={step2.preferredJobs}
                  onChange={(e) => setStep2((p) => ({ ...p, preferredJobs: e.target.value }))}
                  placeholder="쉼표로 구분 (예: 회사원, 공무원, 전문직)"
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold"
                >
                  {isSubmitting ? "등록 중..." : "등록하기"}
                  {!isSubmitting && <Check className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
