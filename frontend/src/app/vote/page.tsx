"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { Checkbox } from "@/common/components/ui/checkbox"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { Vote as VoteIcon, Clock, AlertCircle, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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

export default function VotePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newVote, setNewVote] = useState({
    title: "",
    deadline: "",
    scrimType: "NORMAL" as "NORMAL" | "AUCTION",
    multipleChoice: false,
    anonymous: false,
    options: ["", ""]
  })

  useEffect(() => {
    fetchVotes()
  }, [user?.clanId])

  const fetchVotes = async () => {
    if (!user?.clanId) {
      setIsLoading(false)
      return
    }

    try {
      const response = await api.get(`/votes?clanId=${user.clanId}`)
      setVotes(response.data)
    } catch (error) {
      console.error(error)
      toast.error("투표 목록을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateVote = async () => {
    if (!user?.clanId) {
      toast.error("클랜에 가입되어 있지 않습니다.")
      return
    }

    if (!newVote.title.trim()) {
      toast.error("투표 제목을 입력하세요.")
      return
    }

    if (!newVote.deadline) {
      toast.error("마감 시간을 선택하세요.")
      return
    }

    const validOptions = newVote.options.filter(opt => opt.trim() !== "")
    if (validOptions.length < 2) {
      toast.error("최소 2개의 선택지를 입력하세요.")
      return
    }

    try {
      await api.post("/votes", {
        clanId: user.clanId,
        title: newVote.title,
        deadline: new Date(newVote.deadline).toISOString(),
        scrimType: newVote.scrimType,
        multipleChoice: newVote.multipleChoice,
        anonymous: newVote.anonymous,
        options: validOptions.map(label => ({ label }))
      })

      toast.success("투표가 생성되었습니다.")
      setIsCreateDialogOpen(false)
      setNewVote({
        title: "",
        deadline: "",
        scrimType: "NORMAL",
        multipleChoice: false,
        anonymous: false,
        options: ["", ""]
      })
      fetchVotes()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "투표 생성에 실패했습니다.")
    }
  }

  const addOption = () => {
    setNewVote({ ...newVote, options: [...newVote.options, ""] })
  }

  const removeOption = (index: number) => {
    if (newVote.options.length <= 2) {
      toast.error("최소 2개의 선택지가 필요합니다.")
      return
    }
    setNewVote({ ...newVote, options: newVote.options.filter((_, i) => i !== index) })
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...newVote.options]
    updated[index] = value
    setNewVote({ ...newVote, options: updated })
  }

  const getStatusColor = (status: string) => {
    return status === "OPEN" ? "bg-green-500/10 text-green-500 border-green-500" : "bg-red-500/10 text-red-500 border-red-500"
  }

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  if (!user?.clanId) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
          <Header />
          <main className="container px-4 py-8 max-w-5xl mx-auto">
            <div className="bg-card border border-border border-dashed p-20 text-center rounded-lg">
              <AlertCircle className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">클랜에 가입하면 투표를 이용할 수 있습니다.</p>
            </div>
          </main>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
                <VoteIcon className="text-black w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                  투표 <span className="text-primary">VOTE</span>
                </h1>
                <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Clan Decision Making</p>
              </div>
            </div>

            {user?.role === "ADMIN" && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-black font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    투표 생성
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">새 투표 생성</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">투표 제목</Label>
                      <Input
                        id="title"
                        placeholder="예: 다음 주 스크림 날짜 투표"
                        value={newVote.title}
                        onChange={(e) => setNewVote({ ...newVote, title: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deadline">마감 시간</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={newVote.deadline}
                        onChange={(e) => setNewVote({ ...newVote, deadline: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scrimType">투표 타입</Label>
                      <Select
                        value={newVote.scrimType}
                        onValueChange={(value: "NORMAL" | "AUCTION") => setNewVote({ ...newVote, scrimType: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORMAL">일반 투표</SelectItem>
                          <SelectItem value="AUCTION">경매용 투표</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="multipleChoice"
                          checked={newVote.multipleChoice}
                          onCheckedChange={(checked) => setNewVote({ ...newVote, multipleChoice: checked as boolean })}
                        />
                        <Label htmlFor="multipleChoice" className="cursor-pointer">복수 선택 허용</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="anonymous"
                          checked={newVote.anonymous}
                          onCheckedChange={(checked) => setNewVote({ ...newVote, anonymous: checked as boolean })}
                        />
                        <Label htmlFor="anonymous" className="cursor-pointer">익명 투표</Label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>선택지</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addOption}
                          className="border-border"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          선택지 추가
                        </Button>
                      </div>
                      {newVote.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`선택지 ${index + 1}`}
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="bg-background border-border flex-1"
                          />
                          {newVote.options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleCreateVote}
                      className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                    >
                      투표 생성
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-primary font-bold animate-pulse">투표 로딩 중...</div>
          ) : votes.length === 0 ? (
            <div className="bg-card border border-border border-dashed p-20 text-center rounded-lg">
              <AlertCircle className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground mb-4">진행 중인 투표가 없습니다.</p>
              {user?.role === "ADMIN" && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-black font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 투표 만들기
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {votes.map((vote) => (
                <Card
                  key={vote.id}
                  className="bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/vote/${vote.id}`)}
                >
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={getStatusColor(vote.status)}>
                        {vote.status === "OPEN" ? "진행 중" : "마감"}
                      </Badge>
                      <div className="flex gap-2">
                        {vote.multipleChoice && (
                          <Badge variant="secondary" className="text-xs">복수선택</Badge>
                        )}
                        {vote.anonymous && (
                          <Badge variant="secondary" className="text-xs">익명</Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold italic">{vote.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {isDeadlinePassed(vote.deadline) ? "마감됨" : "마감"}: {new Date(vote.deadline).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">선택지 ({vote.options.length}개)</div>
                      <div className="space-y-1">
                        {vote.options.slice(0, 3).map((option) => (
                          <div key={option.id} className="flex items-center justify-between text-sm py-1 px-2 bg-muted/20 rounded">
                            <span className="truncate">{option.label}</span>
                            {!vote.anonymous && <span className="text-primary font-bold">{option.count}표</span>}
                          </div>
                        ))}
                        {vote.options.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            +{vote.options.length - 3}개 더보기
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
