"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Briefcase, Brain, Cigarette, Trash2, GraduationCap, Ruler, User as UserIcon, Camera, Pencil, Phone, Lock } from "lucide-react"
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
import type { BlindDateProfile } from "@/modules/blind-date/types"
import { statusConfig } from "@/modules/blind-date/types"
import { getImageUrl } from "@/lib/upload"
import { ImageViewer } from "@/components/image-viewer"
import { ImageUploader } from "@/components/image-uploader"

export default function GalleryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const confirm = useConfirm()
  const [hero, setHero] = useState<BlindDateProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [editingPhotos, setEditingPhotos] = useState(false)
  const [photoForm, setPhotoForm] = useState<string[]>([])
  const [isSavingPhotos, setIsSavingPhotos] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: "",
    age: 25,
    location: "",
    desiredLocation: "",
    job: "",
    education: "",
    height: "" as string,
    mbti: "",
    smoking: false,
    description: "",
    idealType: "",
    contactInfo: "",
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)

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
      const mapped: BlindDateProfile = {
        id: h.id,
        registerId: h.registerId,
        registerNickname: h.register?.nickname || h.register?.username || "Unknown",
        name: h.name || "",
        age: h.age || 0,
        gender: h.gender || "MALE",
        location: h.location || "",
        desiredLocation: h.desiredLocation || "",
        job: h.job || "",
        mbti: h.mbti || undefined,
        status: h.status as BlindDateProfile["status"],
        description: h.description || "",
        idealType: h.idealType || "",
        smoking: h.smoking || false,
        education: h.education || "",
        height: h.height,
        photos: h.photos || [],
        contactInfo: h.contactInfo || "",
      }
      setHero(mapped)
    } catch {
      toast.error("프로필을 불러오지 못했습니다.")
      router.push("/gallery")
    } finally {
      setIsLoading(false)
    }
  }

  const startEditPhotos = () => {
    setPhotoForm(hero?.photos || [])
    setEditingProfile(false)
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
      desiredLocation: hero.desiredLocation || "",
      job: hero.job || "",
      education: hero.education || "",
      height: hero.height?.toString() || "",
      mbti: hero.mbti || "",
      smoking: hero.smoking || false,
      description: hero.description || "",
      idealType: hero.idealType || "",
      contactInfo: hero.contactInfo || "",
    })
    setEditingPhotos(false)
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
        desiredLocation: profileForm.desiredLocation,
        job: profileForm.job,
        education: profileForm.education || undefined,
        height: profileForm.height ? Number(profileForm.height) : undefined,
        mbti: profileForm.mbti || undefined,
        smoking: profileForm.smoking,
        description: profileForm.description,
        idealType: profileForm.idealType || undefined,
        contactInfo: profileForm.contactInfo,
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

  const handleClose = async () => {
    if (!hero) return
    const ok = await confirm({ title: "매물을 마감하시겠습니까?", description: "마감 후에는 갤러리에서 비공개 처리됩니다.", confirmText: "마감" })
    if (!ok) return
    try {
      await api.patch(`/blind-date/listings/${hero.id}/close`)
      toast.success("마감 처리되었습니다.")
      fetchHero(hero.id)
    } catch (error) {
      handleApiError(error, "마감 처리에 실패했습니다.")
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

  const statusConf = statusConfig[hero.status] || statusConfig.OPEN
  const isOwner = user?.id === hero.registerId
  const isOpen = hero.status === "OPEN"
  const canManage = isOwner || isAdmin

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
              {hero.photos && hero.photos.length > 0 ? (
                <img src={getImageUrl(hero.photos[0])} alt={hero.name} className="w-full h-full object-cover" />
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
                    <span>-</span>
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

          {/* Contact Info - Always visible for OPEN listings */}
          {hero.contactInfo && isOpen && (
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-primary" />
                <p className="text-sm font-bold text-primary">연락 방법</p>
              </div>
              <p className="text-base font-semibold text-foreground">{hero.contactInfo}</p>
            </div>
          )}
          {hero.status === "CLOSED" && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-semibold">마감된 매물입니다</p>
              </div>
            </div>
          )}

          {/* Photos Gallery */}
          {!editingPhotos && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Camera className="w-4 h-4 text-primary" />
                  사진 ({hero.photos?.length || 0})
                </div>
                {isOwner && isOpen && (
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
                {isOwner && isOpen && (
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
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">원하는 상대 지역</p>
                      <p className="text-sm font-semibold text-foreground">{hero.desiredLocation || "-"}</p>
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
              {(hero.description || isOwner) && (
                <div className="p-4 bg-muted/20 rounded border border-border/50">
                  <p className="text-xs text-muted-foreground font-bold mb-1">소개</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{hero.description ? `"${hero.description}"` : "-"}</p>
                </div>
              )}

              {/* Ideal Type */}
              {(hero.idealType || isOwner) && (
                <div className="p-4 bg-primary/5 rounded border border-primary/20">
                  <p className="text-xs text-primary font-bold mb-1">이상형</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{hero.idealType || "-"}</p>
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
                  <Label className="text-xs text-foreground">거주지 *</Label>
                  <Input
                    value={profileForm.location}
                    onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="예: 서울 강남"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">원하는 상대 지역 *</Label>
                  <Input
                    value={profileForm.desiredLocation}
                    onChange={(e) => setProfileForm((p) => ({ ...p, desiredLocation: e.target.value }))}
                    placeholder="예: 서울, 경기"
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">직업 *</Label>
                  <Input
                    value={profileForm.job}
                    onChange={(e) => setProfileForm((p) => ({ ...p, job: e.target.value }))}
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">학력</Label>
                  <Input
                    value={profileForm.education}
                    onChange={(e) => setProfileForm((p) => ({ ...p, education: e.target.value }))}
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">키 (cm)</Label>
                  <Input
                    type="number" min={140} max={220}
                    value={profileForm.height}
                    onChange={(e) => setProfileForm((p) => ({ ...p, height: e.target.value }))}
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">MBTI</Label>
                  <Input
                    value={profileForm.mbti}
                    onChange={(e) => setProfileForm((p) => ({ ...p, mbti: e.target.value.toUpperCase() }))}
                    maxLength={4}
                    className="bg-input border-border text-foreground h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground">흡연 여부</Label>
                <Switch
                  checked={profileForm.smoking}
                  onCheckedChange={(checked) => setProfileForm((p) => ({ ...p, smoking: checked }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">소개글 *</Label>
                <Textarea
                  value={profileForm.description}
                  onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))}
                  className="bg-input border-border text-foreground text-sm"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">이상형</Label>
                <Textarea
                  value={profileForm.idealType}
                  onChange={(e) => setProfileForm((p) => ({ ...p, idealType: e.target.value }))}
                  className="bg-input border-border text-foreground text-sm"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">연락 방법 *</Label>
                <Input
                  value={profileForm.contactInfo}
                  onChange={(e) => setProfileForm((p) => ({ ...p, contactInfo: e.target.value }))}
                  className="bg-input border-border text-foreground h-9 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-1">
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

          {/* Owner/Admin Actions */}
          {canManage && (
            <div className="flex gap-3 pt-4 border-t border-border">
              {isOpen && (
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                >
                  마감 처리
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDelete}
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>
            </div>
          )}
        </main>

        {/* Image Viewer */}
        {hero.photos && hero.photos.length > 0 && (
          <ImageViewer
            images={hero.photos.map((p) => getImageUrl(p))}
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            initialIndex={viewerIndex}
          />
        )}
      </div>
    </AuthGuard>
  )
}
