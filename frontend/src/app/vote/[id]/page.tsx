"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group"
import { Checkbox } from "@/common/components/ui/checkbox"
import { Label } from "@/common/components/ui/label"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { Vote as VoteIcon, Clock, AlertCircle, ArrowLeft, CheckCircle2, Users } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Progress } from "@/common/components/ui/progress"

interface VoteOption {
  id: string
  label: string
  count: number
}

interface Vote {
  id: string
  clanId: string
  creatorId: string
  title: string
  deadline: string
  status: "OPEN" | "CLOSED"
  scrimType: "NORMAL" | "AUCTION"
  multipleChoice: boolean
  anonymous: boolean
  options: VoteOption[]
  createdAt: string
}

export default function VoteDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [vote, setVote] = useState<Vote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [hasVoted, setHasVoted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchVote()
    }
  }, [params.id])

  const fetchVote = async () => {
    try {
      const response = await api.get(`/votes/${params.id}`)
      setVote(response.data)

      // Check if user has already voted (by checking if any option count shows participation)
      // Note: This is a simplified check. Backend should provide hasVoted status.
    } catch (error: any) {
      console.error(error)
      toast.error("투표를 불러오지 못했습니다.")
      router.push("/vote")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async () => {
    if (!vote) return

    if (vote.multipleChoice) {
      if (selectedOptions.length === 0) {
        toast.error("최소 1개의 선택지를 선택하세요.")
        return
      }
    } else {
      if (!selectedOption) {
        toast.error("선택지를 선택하세요.")
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (vote.multipleChoice) {
        // For multiple choice, cast vote for each selected option
        for (const optionId of selectedOptions) {
          await api.post(`/votes/${vote.id}/cast`, { optionId })
        }
      } else {
        await api.post(`/votes/${vote.id}/cast`, { optionId: selectedOption })
      }

      toast.success("투표가 완료되었습니다!")
      setHasVoted(true)
      fetchVote() // Refresh to show updated counts
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "투표에 실패했습니다."
      if (errorMsg.includes("already voted") || errorMsg.includes("이미")) {
        toast.error("이미 투표하셨습니다.")
        setHasVoted(true)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMultipleChoice = (optionId: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions([...selectedOptions, optionId])
    } else {
      setSelectedOptions(selectedOptions.filter(id => id !== optionId))
    }
  }

  const getStatusColor = (status: string) => {
    return status === "OPEN" ? "bg-green-500/10 text-green-500 border-green-500" : "bg-red-500/10 text-red-500 border-red-500"
  }

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  const canVote = () => {
    return vote && vote.status === "OPEN" && !isDeadlinePassed(vote.deadline) && !hasVoted
  }

  const getTotalVotes = () => {
    if (!vote) return 0
    return vote.options.reduce((sum, opt) => sum + opt.count, 0)
  }

  const getVotePercentage = (count: number) => {
    const total = getTotalVotes()
    if (total === 0) return 0
    return Math.round((count / total) * 100)
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
          <Header />
          <main className="container px-4 py-8 max-w-4xl mx-auto">
            <div className="text-center py-20 text-primary font-bold animate-pulse">투표 로딩 중...</div>
          </main>
        </div>
      </AuthGuard>
    )
  }

  if (!vote) {
    return null
  }

  const showResults = hasVoted || vote.status === "CLOSED" || isDeadlinePassed(vote.deadline)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push("/vote")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            투표 목록으로
          </Button>

          {/* Vote Header */}
          <Card className="bg-card border-border">
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={getStatusColor(vote.status)}>
                    {vote.status === "OPEN" ? "진행 중" : "마감"}
                  </Badge>
                  {vote.multipleChoice && (
                    <Badge variant="secondary">복수선택</Badge>
                  )}
                  {vote.anonymous && (
                    <Badge variant="secondary">익명</Badge>
                  )}
                  <Badge variant="outline" className="border-primary text-primary">
                    {vote.scrimType === "NORMAL" ? "일반 투표" : "경매용 투표"}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-3xl font-black italic">{vote.title}</CardTitle>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {isDeadlinePassed(vote.deadline) ? "마감됨" : "마감"}: {new Date(vote.deadline).toLocaleString("ko-KR")}
                  </span>
                </div>
                {!vote.anonymous && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>총 {getTotalVotes()}표</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {hasVoted && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-bold">투표가 완료되었습니다!</span>
                </div>
              )}

              {canVote() ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">
                      선택지를 {vote.multipleChoice ? "선택하세요 (복수 선택 가능)" : "선택하세요"}
                    </h3>

                    {vote.multipleChoice ? (
                      <div className="space-y-3">
                        {vote.options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer border border-border"
                            onClick={() => {
                              const checked = !selectedOptions.includes(option.id)
                              handleMultipleChoice(option.id, checked)
                            }}
                          >
                            <Checkbox
                              id={option.id}
                              checked={selectedOptions.includes(option.id)}
                              onCheckedChange={(checked) => handleMultipleChoice(option.id, checked as boolean)}
                            />
                            <Label htmlFor={option.id} className="flex-1 cursor-pointer text-base font-medium">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                        <div className="space-y-3">
                          {vote.options.map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer border border-border"
                              onClick={() => setSelectedOption(option.id)}
                            >
                              <RadioGroupItem value={option.id} id={option.id} />
                              <Label htmlFor={option.id} className="flex-1 cursor-pointer text-base font-medium">
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}
                  </div>

                  <Button
                    onClick={handleVote}
                    disabled={isSubmitting || (vote.multipleChoice ? selectedOptions.length === 0 : !selectedOption)}
                    className="w-full bg-primary hover:bg-primary/90 text-black font-bold text-lg h-12"
                  >
                    {isSubmitting ? "투표 중..." : "투표하기"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">투표 결과</h3>
                    {vote.status === "CLOSED" && (
                      <Badge className="bg-red-500/20 text-red-500 border-red-500">마감됨</Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {vote.options
                      .sort((a, b) => b.count - a.count)
                      .map((option, index) => (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {index === 0 && option.count > 0 && (
                                <span className="text-xl">🏆</span>
                              )}
                              <span className="font-medium">{option.label}</span>
                            </div>
                            {!vote.anonymous && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">{getVotePercentage(option.count)}%</span>
                                <span className="text-primary font-bold">{option.count}표</span>
                              </div>
                            )}
                          </div>
                          {!vote.anonymous && (
                            <Progress value={getVotePercentage(option.count)} className="h-3" />
                          )}
                        </div>
                      ))}
                  </div>

                  {vote.anonymous && (
                    <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
                      <p className="text-muted-foreground text-sm">익명 투표로 결과가 공개되지 않습니다.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vote Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold">투표 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">생성일</span>
                <span>{new Date(vote.createdAt).toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">마감 시간</span>
                <span>{new Date(vote.deadline).toLocaleString("ko-KR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">투표 타입</span>
                <span>{vote.scrimType === "NORMAL" ? "일반 투표" : "경매용 투표"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">복수 선택</span>
                <span>{vote.multipleChoice ? "가능" : "불가능"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">익명 여부</span>
                <span>{vote.anonymous ? "익명" : "공개"}</span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
