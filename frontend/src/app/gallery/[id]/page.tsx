"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Briefcase, Brain, Cigarette, Trash2, GraduationCap, Ruler, User as UserIcon, Send, Heart, Camera, Pencil, XCircle } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Textarea } from "@/common/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { Switch } from "@/common/components/ui/switch"
import { Header } from "@/common/layouts/header"
import { AuthGuard } from "@/common/components/auth-guard"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { useConfirm } from "@/common/components/confirm-dialog"
import { handleApiError } from "@/lib/api-error"
import type { HeroWithPreference, BlindDateRequestItem } from "@/modules/blind-date/types"
import { statusConfig, EDUCATION_LABELS, REQUEST_STATUS_CONFIG } from "@/modules/blind-date/types"
import type { MinEducation } from "@/modules/blind-date/types"
import { getImageUrl } from "@/lib/upload"
import { ImageViewer } from "@/components/image-viewer"
import { ImageUploader } from "@/components/image-uploader"

export default function GalleryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const confirm = useConfirm()
  const [hero, setHero] = useState<HeroWithPreference | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("안녕하세요! 프로필 보고 연락드렸습니다.")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [editingPref, setEditingPref] = useState(false)
  const [prefForm, setPrefForm] = useState({
    minAge: "",
    maxAge: "",
    preferredGender: "",
    minEducation: "",
    minHeight: "",
    maxHeight: "",
    preferredLocations: "",
    preferredJobs: "",
  })
  const [isSavingPref, setIsSavingPref] = useState(false)
  const [editingPhotos, setEditingPhotos] = useState(false)
  const [photoForm, setPhotoForm] = useState<string[]>([])
  const [isSavingPhotos, setIsSavingPhotos] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: "",
    age: 25,
    location: "",
    job: "",
    education: "",
    height: "" as string,
    mbti: "",
    smoking: false,
    bio: "",
    idealType: "",
    contactInfo: "",
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [requests, setRequests] = useState<BlindDateRequestItem[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchHero(params.id as string)
    }
  }, [params.id])

  const fetchHero = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await api.get(`/blind-date/listings/${id}`)
      const h = response.data
      const mapped: HeroWithPreference = {
        id: h.id,
        registerId: h.registerId,
        registerNickname: h.register?.nickname || h.register?.username || "Unknown",
        name: h.name || "",
        age: h.age || 0,
        gender: h.gender || "MALE",
        location: h.location || "",
        job: h.job || "",
        mbti: h.mbti || "",
        status: (h.status === "OPEN" ? "available" : h.status === "MATCHED" ? "talking" : "taken") as HeroWithPreference["status"],
        bio: h.description || "",
        idealType: h.idealType || "",
        smoking: h.smoking || false,
        education: h.education || "",
        height: h.height,
        avatar: h.photos?.[0],
        photos: h.photos || [],
        contactInfo: h.contactInfo || "",
        preference: h.preference || undefined,
      }
      setHero(mapped)
    } catch {
      toast.error("프로필을 불러오지 못했습니다.")
      router.push("/gallery")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (hero && user?.id === hero.registerId) {
      fetchRequests(hero.id)
    }
  }, [hero?.id, hero?.registerId, user?.id])

  const fetchRequests = async (listingId: string) => {
    try {
      setRequestsLoading(true)
      const response = await api.get(`/blind-date/listings/${listingId}/requests`)
      setRequests(response.data)
    } catch {
      // silently fail — user may not be owner
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    const ok = await confirm({ title: "신청을 승인하시겠습니까?", description: "승인 시 다른 대기 중인 신청은 자동 거절됩니다.", confirmText: "승인" })
    if (!ok) return
    try {
      await api.post(`/blind-date/requests/${requestId}/approve`)
      toast.success("신청이 승인되었습니다.")
      if (hero) {
        fetchHero(hero.id)
        fetchRequests(hero.id)
      }
    } catch (error) {
      handleApiError(error, "승인에 실패했습니다.")
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const ok = await confirm({ title: "신청을 거절하시겠습니까?", variant: "destructive", confirmText: "거절" })
    if (!ok) return
    try {
      await api.post(`/blind-date/requests/${requestId}/reject`)
      toast.success("신청이 거절되었습니다.")
      if (hero) fetchRequests(hero.id)
    } catch (error) {
      handleApiError(error, "거절에 실패했습니다.")
    }
  }

  const startEditPref = () => {
    const p = hero?.preference
    setPrefForm({
      minAge: p?.minAge?.toString() || "",
      maxAge: p?.maxAge?.toString() || "",
      preferredGender: p?.preferredGender || "",
      minEducation: p?.minEducation || "",
      minHeight: p?.minHeight?.toString() || "",
      maxHeight: p?.maxHeight?.toString() || "",
      preferredLocations: p?.preferredLocations?.join(", ") || "",
      preferredJobs: p?.preferredJobs?.join(", ") || "",
    })
    setEditingProfile(false)
    setEditingPhotos(false)
    setEditingPref(true)
  }

  const handleSavePref = async () => {
    if (!hero) return
    const preference: Record<string, unknown> = {}
    if (prefForm.minAge) preference.minAge = Number(prefForm.minAge)
    if (prefForm.maxAge) preference.maxAge = Number(prefForm.maxAge)
    if (prefForm.preferredGender) preference.preferredGender = prefForm.preferredGender
    if (prefForm.minEducation) preference.minEducation = prefForm.minEducation
    if (prefForm.minHeight) preference.minHeight = Number(prefForm.minHeight)
    if (prefForm.maxHeight) preference.maxHeight = Number(prefForm.maxHeight)
    if (prefForm.preferredLocations.trim()) {
      preference.preferredLocations = prefForm.preferredLocations.split(",").map((s) => s.trim()).filter(Boolean)
    }
    if (prefForm.preferredJobs.trim()) {
      preference.preferredJobs = prefForm.preferredJobs.split(",").map((s) => s.trim()).filter(Boolean)
    }

    if (Object.keys(preference).length === 0) {
      toast.error("최소 하나의 조건을 입력해주세요.")
      return
    }

    try {
      setIsSavingPref(true)
      await api.put(`/blind-date/listings/${hero.id}`, { preference })
      toast.success("희망 조건이 저장되었습니다.")
      setEditingPref(false)
      fetchHero(hero.id)
    } catch (error) {
      handleApiError(error, "희망 조건 저장에 실패했습니다.")
    } finally {
      setIsSavingPref(false)
    }
  }

  const startEditPhotos = () => {
    setPhotoForm(hero?.photos || [])
    setEditingProfile(false)
    setEditingPref(false)
    setEditingPhotos(true)
  }

  const handleSavePhotos = async () => {
    if (!hero) return
    try {
      setIsSavingPhotos(true)
      await api.put(`/blind-date/listings/${hero.id}`, { photos: photoForm })
      toast.success("사진이 저장되었습니다.")
      setEditingPhotos(false)
      fetchHero(hero.id)
    } catch (error) {
      handleApiError(error, "사진 저장에 실패했습니다.")
    } finally {
      setIsSavingPhotos(false)
    }
  }

  const startEditProfile = () => {
    if (!hero) return
    setProfileForm({
      name: hero.name || "",
      age: hero.age || 25,
      location: hero.location || "",
      job: hero.job || "",
      education: hero.education || "",
      height: hero.height?.toString() || "",
      mbti: hero.mbti || "",
      smoking: hero.smoking || false,
      bio: hero.bio || "",
      idealType: hero.idealType || "",
      contactInfo: hero.contactInfo || "",
    })
    setEditingPhotos(false)
    setEditingPref(false)
    setEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    if (!hero) return
    if (!profileForm.name.trim() || profileForm.age < 18) {
      toast.error("이름과 나이(18세 이상)는 필수입니다.")
      return
    }
    try {
      setIsSavingProfile(true)
      await api.put(`/blind-date/listings/${hero.id}`, {
        name: profileForm.name,
        age: profileForm.age,
        location: profileForm.location,
        job: profileForm.job,
        education: profileForm.education,
        height: profileForm.height ? Number(profileForm.height) : undefined,
        mbti: profileForm.mbti,
        smoking: profileForm.smoking,
        description: profileForm.bio,
        idealType: profileForm.idealType,
        ...(profileForm.contactInfo ? { contactInfo: profileForm.contactInfo } : {}),
      })
      toast.success("프로필이 저장되었습니다.")
      setEditingProfile(false)
      fetchHero(hero.id)
    } catch (error) {
      handleApiError(error, "프로필 저장에 실패했습니다.")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleApply = async () => {
    if (!hero) return
    try {
      setIsSubmitting(true)
      await api.post(`/blind-date/listings/${hero.id}/request`, { message })
      toast.success("신청이 완료되었습니다! 매니저의 확인을 기다려주세요.")
      router.push("/gallery")
    } catch (error) {
      handleApiError(error, "신청에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    if (!hero) return
    try {
      const backendStatus = status === "available" ? "OPEN" : status === "talking" ? "MATCHED" : "CLOSED"
      await api.patch(`/blind-date/listings/${hero.id}`, { status: backendStatus })
      toast.success("상태가 업데이트되었습니다.")
      fetchHero(hero.id)
    } catch {
      toast.error("상태 변경에 실패했습니다.")
    }
  }

  const handleDelete = async () => {
    if (!hero) return
    const ok = await confirm({ title: "정말 삭제하시겠습니까?", variant: "destructive", confirmText: "삭제" })
    if (!ok) return
    try {
      await api.delete(`/blind-date/listings/${hero.id}`)
      toast.success("삭제되었습니다.")
      router.push("/gallery")
    } catch (error) {
      handleApiError(error, "매물 삭제에 실패했습니다.")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
          프로필 로딩 중...
        </div>
      </div>
    )
  }

  if (!hero) return null

  const statusConf = statusConfig[hero.status] || statusConfig.available
  const isOwner = user?.id === hero.registerId
  const pref = hero.preference

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container max-w-2xl px-4 py-6 space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/gallery")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            목록으로
          </Button>

          {/* Header Section */}
          <div className="flex items-start gap-4">
            <div
              className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/50 shrink-0 overflow-hidden cursor-pointer"
              onClick={() => {
                if (hero.photos && hero.photos.length > 0) {
                  setViewerIndex(0)
                  setViewerOpen(true)
                }
              }}
            >
              {hero.avatar ? (
                <img src={getImageUrl(hero.avatar)} alt={hero.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-foreground">{hero.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-foreground">{hero.name}</h1>
                <Badge className={cn(statusConf.color)}>{statusConf.label}</Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{hero.age}세</span>
                {hero.mbti && (
                  <>
                    <span>·</span>
                    <span>{hero.mbti}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-bold bg-primary/10 w-fit px-2 py-1 rounded">
                <UserIcon className="w-3 h-3" />
                <span>등록자: {hero.registerNickname}</span>
              </div>
            </div>
          </div>

          {/* Photos Gallery */}
          {!editingPhotos && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Camera className="w-4 h-4 text-primary" />
                  사진 ({hero.photos?.length || 0})
                </div>
                {isOwner && hero.status === "available" && (
                  <Button variant="ghost" size="sm" onClick={startEditPhotos} className="text-primary hover:text-primary/80 h-7 px-2">
                    <Pencil className="w-3 h-3 mr-1" />
                    {hero.photos && hero.photos.length > 0 ? "수정" : "추가"}
                  </Button>
                )}
              </div>
              {hero.photos && hero.photos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {hero.photos.map((photo, i) => (
                    <div
                      key={photo}
                      className={cn(
                        "relative rounded-lg overflow-hidden border border-border/50 cursor-pointer hover:border-primary/50 transition-colors",
                        i === 0 ? "col-span-2 row-span-2" : "aspect-square",
                      )}
                      onClick={() => {
                        setViewerIndex(i)
                        setViewerOpen(true)
                      }}
                    >
                      <img
                        src={getImageUrl(photo)}
                        alt={`${hero.name} 사진 ${i + 1}`}
                        className={cn("w-full h-full object-cover", i === 0 && "aspect-square")}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                isOwner && (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    등록된 사진이 없습니다
                  </div>
                )
              )}
            </div>
          )}

          {/* Photos Edit Mode */}
          {editingPhotos && (
            <div className="space-y-3 p-4 border border-primary/20 rounded-lg bg-primary/5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Camera className="w-4 h-4 text-primary" />
                사진 편집 (최대 5장)
              </div>
              <ImageUploader
                value={photoForm}
                onChange={setPhotoForm}
                maxCount={5}
              />
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setEditingPhotos(false)} className="flex-1">
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePhotos}
                  disabled={isSavingPhotos}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold"
                >
                  {isSavingPhotos ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          )}

          {/* Profile Section: View or Edit */}
          {!editingProfile ? (
            <>
              {/* Details Grid */}
              <div className="space-y-2">
                {isOwner && hero.status === "available" && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={startEditProfile} className="text-primary hover:text-primary/80 h-7 px-2">
                      <Pencil className="w-3 h-3 mr-1" />
                      프로필 수정
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">거주지</p>
                      <p className="text-sm font-semibold text-foreground">{hero.location || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                    <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">직업</p>
                      <p className="text-sm font-semibold text-foreground">{hero.job || "-"}</p>
                    </div>
                  </div>
                  {(hero.education || isOwner) && (
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">학력</p>
                        <p className="text-sm font-semibold text-foreground">{hero.education || "-"}</p>
                      </div>
                    </div>
                  )}
                  {(hero.height || isOwner) && (
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">키</p>
                        <p className="text-sm font-semibold text-foreground">{hero.height ? `${hero.height}cm` : "-"}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                    <Brain className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">MBTI</p>
                      <p className="text-sm font-semibold text-foreground">{hero.mbti || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                    <Cigarette className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">흡연</p>
                      <p className="text-sm font-semibold text-foreground">{hero.smoking ? "O" : "X"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {(hero.bio || isOwner) && (
                <div className="p-4 bg-muted/20 rounded border border-border/50">
                  <p className="text-xs text-muted-foreground font-bold mb-1">소개</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{hero.bio ? `"${hero.bio}"` : "-"}</p>
                </div>
              )}

              {/* Ideal Type */}
              {(hero.idealType || isOwner) && (
                <div className="p-4 bg-primary/5 rounded border border-primary/20">
                  <p className="text-xs text-primary font-bold mb-1">원하는 상대 조건</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{hero.idealType || "-"}</p>
                </div>
              )}

              {/* Contact Info - Owner always sees, others see after match */}
              {hero.contactInfo && isOwner && (
                <div className="p-4 bg-blue-500/5 rounded border border-blue-500/20">
                  <p className="text-xs text-blue-500 font-bold mb-1">연락처 (매칭 후 공개)</p>
                  <p className="text-sm text-foreground">{hero.contactInfo}</p>
                </div>
              )}
              {hero.contactInfo && !isOwner && (hero.status === "talking" || hero.status === "taken") && (
                <div className="p-4 bg-blue-500/5 rounded border border-blue-500/20">
                  <p className="text-xs text-blue-500 font-bold mb-1">연락처</p>
                  <p className="text-sm text-foreground">{hero.contactInfo}</p>
                </div>
              )}
            </>
          ) : (
            /* Profile Edit Form */
            <div className="p-4 border border-primary/20 rounded-lg bg-primary/5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">프로필 수정</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">이름 *</Label>
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">나이 *</Label>
                  <Input
                    type="number" min={18} max={99}
                    value={profileForm.age}
                    onChange={(e) => setProfileForm((p) => ({ ...p, age: Number(e.target.value) }))}
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">거주지</Label>
                  <Input
                    value={profileForm.location}
                    onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="예: 서울 강남"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">직업</Label>
                  <Input
                    value={profileForm.job}
                    onChange={(e) => setProfileForm((p) => ({ ...p, job: e.target.value }))}
                    placeholder="예: 회사원"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">학력</Label>
                  <Input
                    value={profileForm.education}
                    onChange={(e) => setProfileForm((p) => ({ ...p, education: e.target.value }))}
                    placeholder="예: 대학교 졸업"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">키 (cm)</Label>
                  <Input
                    type="number" min={140} max={220}
                    value={profileForm.height}
                    onChange={(e) => setProfileForm((p) => ({ ...p, height: e.target.value }))}
                    placeholder="예: 175"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">MBTI</Label>
                  <Input
                    value={profileForm.mbti}
                    onChange={(e) => setProfileForm((p) => ({ ...p, mbti: e.target.value.toUpperCase() }))}
                    placeholder="예: ENFP"
                    maxLength={4}
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                  <Label className="text-xs text-foreground">흡연 여부</Label>
                  <Switch
                    checked={profileForm.smoking}
                    onCheckedChange={(checked) => setProfileForm((p) => ({ ...p, smoking: checked }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">소개글</Label>
                <Textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="간단한 자기소개를 작성하세요"
                  className="bg-input border-border text-foreground text-sm"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">원하는 상대 조건</Label>
                <Textarea
                  value={profileForm.idealType}
                  onChange={(e) => setProfileForm((p) => ({ ...p, idealType: e.target.value }))}
                  placeholder="예: 성실하고 유머 감각 있는 분"
                  className="bg-input border-border text-foreground text-sm"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">연락처 (매칭 후 공개)</Label>
                <Input
                  value={profileForm.contactInfo}
                  onChange={(e) => setProfileForm((p) => ({ ...p, contactInfo: e.target.value }))}
                  placeholder="예: 카카오톡 ID, 전화번호 등"
                  className="bg-input border-border text-foreground h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">매칭이 성사된 후에만 상대방에게 공개됩니다.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)} className="flex-1">
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold"
                >
                  {isSavingProfile ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          )}

          {/* Preference Section */}
          {pref && !editingPref && (
            <div className="p-4 bg-pink-500/5 rounded border border-pink-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <p className="text-xs text-pink-500 font-bold">희망 상대 조건</p>
                </div>
                {isOwner && hero.status === "available" && (
                  <Button variant="ghost" size="sm" onClick={startEditPref} className="text-pink-500 hover:text-pink-400 h-7 px-2">
                    <Pencil className="w-3 h-3 mr-1" />
                    수정
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(pref.minAge || pref.maxAge) && (
                  <div>
                    <p className="text-xs text-muted-foreground">나이</p>
                    <p className="font-semibold text-foreground">
                      {pref.minAge && pref.maxAge
                        ? `${pref.minAge}세 ~ ${pref.maxAge}세`
                        : pref.minAge
                          ? `${pref.minAge}세 이상`
                          : `${pref.maxAge}세 이하`}
                    </p>
                  </div>
                )}
                {pref.preferredGender && (
                  <div>
                    <p className="text-xs text-muted-foreground">선호 성별</p>
                    <p className="font-semibold text-foreground">{pref.preferredGender === "MALE" ? "남성" : "여성"}</p>
                  </div>
                )}
                {pref.minEducation && (
                  <div>
                    <p className="text-xs text-muted-foreground">최소 학력</p>
                    <p className="font-semibold text-foreground">{EDUCATION_LABELS[pref.minEducation as MinEducation] || pref.minEducation}</p>
                  </div>
                )}
                {(pref.minHeight || pref.maxHeight) && (
                  <div>
                    <p className="text-xs text-muted-foreground">키</p>
                    <p className="font-semibold text-foreground">
                      {pref.minHeight && pref.maxHeight
                        ? `${pref.minHeight}cm ~ ${pref.maxHeight}cm`
                        : pref.minHeight
                          ? `${pref.minHeight}cm 이상`
                          : `${pref.maxHeight}cm 이하`}
                    </p>
                  </div>
                )}
              </div>
              {pref.preferredLocations && pref.preferredLocations.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">선호 지역</p>
                  <div className="flex flex-wrap gap-1">
                    {pref.preferredLocations.map((loc) => (
                      <Badge key={loc} variant="secondary" className="text-xs">{loc}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {pref.preferredJobs && pref.preferredJobs.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">선호 직업</p>
                  <div className="flex flex-wrap gap-1">
                    {pref.preferredJobs.map((job) => (
                      <Badge key={job} variant="secondary" className="text-xs">{job}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Owner: Add preference button (when no preference exists) */}
          {isOwner && !pref && !editingPref && hero.status === "available" && (
            <Button
              onClick={startEditPref}
              variant="outline"
              className="w-full border-pink-500/30 text-pink-500 hover:bg-pink-500/10"
            >
              <Heart className="w-4 h-4 mr-2" />
              희망 상대 조건 등록하기
            </Button>
          )}

          {/* Preference Edit Form */}
          {editingPref && (
            <div className="p-4 bg-pink-500/5 rounded border border-pink-500/20 space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <p className="text-xs text-pink-500 font-bold">
                  {pref ? "희망 상대 조건 수정" : "희망 상대 조건 등록"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">모두 선택사항입니다. 원하는 항목만 입력하세요.</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">최소 나이</Label>
                  <Input
                    type="number" min={18} max={99}
                    value={prefForm.minAge}
                    onChange={(e) => setPrefForm((p) => ({ ...p, minAge: e.target.value }))}
                    placeholder="예: 20"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">최대 나이</Label>
                  <Input
                    type="number" min={18} max={99}
                    value={prefForm.maxAge}
                    onChange={(e) => setPrefForm((p) => ({ ...p, maxAge: e.target.value }))}
                    placeholder="예: 35"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">선호 성별</Label>
                  <Select
                    value={prefForm.preferredGender || "__none__"}
                    onValueChange={(v) => setPrefForm((p) => ({ ...p, preferredGender: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-input border-border h-9 text-sm">
                      <SelectValue placeholder="선택 안 함" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="__none__">선택 안 함</SelectItem>
                      <SelectItem value="MALE">남성</SelectItem>
                      <SelectItem value="FEMALE">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">최소 학력</Label>
                  <Select
                    value={prefForm.minEducation || "__none__"}
                    onValueChange={(v) => setPrefForm((p) => ({ ...p, minEducation: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-input border-border h-9 text-sm">
                      <SelectValue placeholder="선택 안 함" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="__none__">선택 안 함</SelectItem>
                      {(Object.entries(EDUCATION_LABELS) as [MinEducation, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">최소 키 (cm)</Label>
                  <Input
                    type="number" min={100} max={250}
                    value={prefForm.minHeight}
                    onChange={(e) => setPrefForm((p) => ({ ...p, minHeight: e.target.value }))}
                    placeholder="예: 160"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">최대 키 (cm)</Label>
                  <Input
                    type="number" min={100} max={250}
                    value={prefForm.maxHeight}
                    onChange={(e) => setPrefForm((p) => ({ ...p, maxHeight: e.target.value }))}
                    placeholder="예: 185"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">선호 지역</Label>
                <Input
                  value={prefForm.preferredLocations}
                  onChange={(e) => setPrefForm((p) => ({ ...p, preferredLocations: e.target.value }))}
                  placeholder="쉼표로 구분 (예: 서울, 경기, 인천)"
                  className="bg-input border-border text-foreground h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">선호 직업</Label>
                <Input
                  value={prefForm.preferredJobs}
                  onChange={(e) => setPrefForm((p) => ({ ...p, preferredJobs: e.target.value }))}
                  placeholder="쉼표로 구분 (예: 회사원, 공무원, 전문직)"
                  className="bg-input border-border text-foreground h-9 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingPref(false)} className="flex-1">
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePref}
                  disabled={isSavingPref}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold"
                >
                  {isSavingPref ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          )}

          {/* Apply Section */}
          {hero.status === "available" && !isOwner && (
            <div className="p-4 border border-primary/30 rounded-lg space-y-3 bg-primary/5">
              <p className="text-sm font-bold text-foreground">소개팅 신청</p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="상대방에게 전달할 메시지를 입력하세요"
                className="bg-input border-border text-foreground"
                rows={3}
              />
              <Button
                onClick={handleApply}
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-6 text-lg"
              >
                <Send className="w-5 h-5 mr-2" />
                {isSubmitting ? "신청 중..." : "소개팅 신청하기"}
              </Button>
            </div>
          )}

          {isOwner && (
            <div className="space-y-3">
              {hero.status === "available" && (
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    const ok = await confirm({ title: "매물을 닫으시겠습니까?", description: "닫힌 매물은 더 이상 신청을 받지 않습니다.", variant: "destructive", confirmText: "닫기" })
                    if (!ok) return
                    try {
                      await api.patch(`/blind-date/listings/${hero.id}`, { status: "CLOSED" })
                      toast.success("매물이 닫혔습니다.")
                      fetchHero(hero.id)
                    } catch (error) {
                      handleApiError(error, "매물 닫기에 실패했습니다.")
                    }
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  매물 닫기
                </Button>
              )}
              <div className="text-center p-3 bg-muted/20 rounded border border-dashed border-border text-xs text-muted-foreground">
                내가 등록한 매물입니다.
              </div>
            </div>
          )}

          {/* Owner: Request List */}
          {isOwner && requests.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground">소개팅 신청 목록 ({requests.length})</p>
              <div className="space-y-2">
                {requests.map((req) => {
                  const statusConf2 = REQUEST_STATUS_CONFIG[req.status]
                  return (
                    <div key={req.id} className="p-3 border border-border/50 rounded-lg bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {req.requester?.nickname || req.requester?.username || "Unknown"}
                          </span>
                          <Badge className={cn("text-xs", statusConf2.color)}>{statusConf2.label}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      {req.message && (
                        <p className="text-sm text-muted-foreground">{req.message}</p>
                      )}
                      {req.status === "PENDING" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRejectRequest(req.id)}
                          >
                            거절
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                            onClick={() => handleApproveRequest(req.id)}
                          >
                            승인
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {isOwner && !requestsLoading && requests.length === 0 && (
            <div className="text-center p-3 text-xs text-muted-foreground">
              아직 신청이 없습니다.
            </div>
          )}

          {/* Admin Controls */}
          {isAdmin && (
            <div className="pt-4 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">상태 변경:</span>
                <Select value={hero.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="w-32 bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="available">만남 가능</SelectItem>
                    <SelectItem value="talking">소개팅 중</SelectItem>
                    <SelectItem value="taken">매칭 완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>
            </div>
          )}
        </main>

        {/* Image Viewer Lightbox */}
        {hero.photos && hero.photos.length > 0 && (
          <ImageViewer
            images={hero.photos}
            initialIndex={viewerIndex}
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </div>
    </AuthGuard>
  )
}
