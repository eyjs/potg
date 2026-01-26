"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Briefcase, Brain, Cigarette, Trash2, GraduationCap, Ruler, User as UserIcon, Send, Heart, Camera } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Textarea } from "@/common/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { Header } from "@/common/layouts/header"
import { AuthGuard } from "@/common/components/auth-guard"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import type { HeroWithPreference } from "@/modules/blind-date/types"
import { statusConfig, EDUCATION_LABELS } from "@/modules/blind-date/types"
import type { MinEducation } from "@/modules/blind-date/types"
import { getImageUrl } from "@/lib/upload"
import { ImageViewer } from "@/components/image-viewer"

export default function GalleryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const [hero, setHero] = useState<HeroWithPreference | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("안녕하세요! 프로필 보고 연락드렸습니다.")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

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

  const handleApply = async () => {
    if (!hero) return
    try {
      setIsSubmitting(true)
      await api.post(`/blind-date/listings/${hero.id}/request`, { message })
      toast.success("신청이 완료되었습니다! 매니저의 확인을 기다려주세요.")
      router.push("/gallery")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "신청에 실패했습니다.")
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
    if (!hero || !confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.delete(`/blind-date/listings/${hero.id}`)
      toast.success("삭제되었습니다.")
      router.push("/gallery")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "매물 삭제에 실패했습니다.")
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
          {hero.photos && hero.photos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Camera className="w-4 h-4 text-primary" />
                사진 ({hero.photos.length})
              </div>
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
            </div>
          )}

          {/* Details Grid */}
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
            {hero.education && (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">학력</p>
                  <p className="text-sm font-semibold text-foreground">{hero.education}</p>
                </div>
              </div>
            )}
            {hero.height && (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">키</p>
                  <p className="text-sm font-semibold text-foreground">{hero.height}cm</p>
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

          {/* Bio */}
          {hero.bio && (
            <div className="p-4 bg-muted/20 rounded border border-border/50">
              <p className="text-xs text-muted-foreground font-bold mb-1">소개</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">&quot;{hero.bio}&quot;</p>
            </div>
          )}

          {/* Ideal Type */}
          {hero.idealType && (
            <div className="p-4 bg-primary/5 rounded border border-primary/20">
              <p className="text-xs text-primary font-bold mb-1">원하는 상대 조건</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{hero.idealType}</p>
            </div>
          )}

          {/* Preference Section */}
          {pref && (
            <div className="p-4 bg-pink-500/5 rounded border border-pink-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <p className="text-xs text-pink-500 font-bold">희망 상대 조건</p>
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
            <div className="text-center p-3 bg-muted/20 rounded border border-dashed border-border text-xs text-muted-foreground">
              내가 등록한 매물입니다. 신청 내역은 매니저를 통해 확인해주세요.
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
