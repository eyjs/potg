"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { Check, X, User, Crown, Shield, UserX, ArrowRightLeft, Info, Save, Users } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/common/components/ui/badge"

type ClanRole = "MASTER" | "MANAGER" | "MEMBER"

interface ClanMember {
  id: string
  userId: string
  role: ClanRole
  totalPoints: number
  user: {
    id: string
    battleTag: string
    mainRole: string
  }
}

interface JoinRequest {
  id: string
  message: string
  user: {
    battleTag: string
  }
}

interface ClanInfo {
  id: string
  name: string
  tag: string
  description: string
  members: ClanMember[]
}

export default function ClanManagePage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [members, setMembers] = useState<ClanMember[]>([])
  const [myMembership, setMyMembership] = useState<ClanMember | null>(null)
  const [clanInfo, setClanInfo] = useState<ClanInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("members")

  // 클랜 정보 수정 폼
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user?.clanId) return
    setIsLoading(true)
    try {
      const [requestsRes, membersRes, membershipRes, clanRes] = await Promise.all([
        api.get(`/clans/${user.clanId}/requests`),
        api.get(`/clans/${user.clanId}/members`),
        api.get('/clans/membership/me'),
        api.get(`/clans/${user.clanId}`),
      ])
      setRequests(requestsRes.data)
      setMembers(membersRes.data)
      setMyMembership(membershipRes.data)
      setClanInfo(clanRes.data)
      setEditName(clanRes.data.name || "")
      setEditDescription(clanRes.data.description || "")
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.clanId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/clans/requests/${requestId}/${action}`)
      toast.success(action === 'approve' ? "승인되었습니다." : "거절되었습니다.")
      fetchData()
    } catch {
      toast.error("처리 실패")
    }
  }

  const handleRoleChange = async (userId: string, newRole: ClanRole) => {
    if (!user?.clanId) return
    try {
      await api.patch(`/clans/${user.clanId}/members/${userId}/role`, { role: newRole })
      toast.success("역할이 변경되었습니다.")
      fetchData()
    } catch {
      toast.error("역할 변경 실패")
    }
  }

  const handleKick = async (userId: string, battleTag: string) => {
    if (!user?.clanId) return
    if (!confirm(`정말 ${battleTag}님을 추방하시겠습니까?`)) return
    try {
      await api.post(`/clans/${user.clanId}/members/${userId}/kick`)
      toast.success("추방되었습니다.")
      fetchData()
    } catch {
      toast.error("추방 실패")
    }
  }

  const handleTransferMaster = async (newMasterId: string, battleTag: string) => {
    if (!user?.clanId) return
    if (!confirm(`정말 ${battleTag}님에게 마스터 권한을 양도하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await api.post(`/clans/${user.clanId}/transfer-master`, { newMasterId })
      toast.success("마스터 권한이 양도되었습니다.")
      fetchData()
    } catch {
      toast.error("권한 양도 실패")
    }
  }

  const handleUpdateClanInfo = async () => {
    if (!user?.clanId || !editName.trim()) {
      toast.error("클랜명을 입력해주세요.")
      return
    }
    setIsSaving(true)
    try {
      await api.patch(`/clans/${user.clanId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
      })
      toast.success("클랜 정보가 수정되었습니다.")
      fetchData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "수정 실패")
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleIcon = (role: ClanRole) => {
    switch (role) {
      case "MASTER": return <Crown className="w-4 h-4 text-yellow-500" />
      case "MANAGER": return <Shield className="w-4 h-4 text-blue-500" />
      default: return <User className="w-4 h-4 text-muted-foreground" />
    }
  }

  const canManageMembers = myMembership?.role === "MASTER" || myMembership?.role === "MANAGER"
  const isMaster = myMembership?.role === "MASTER"

  const groupedMembers = {
    MASTER: members.filter(m => m.role === "MASTER"),
    MANAGER: members.filter(m => m.role === "MANAGER"),
    MEMBER: members.filter(m => m.role === "MEMBER"),
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-foreground">
              클랜 <span className="text-primary">관리</span>
            </h1>
            {clanInfo && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary font-bold">
                [{clanInfo.tag}] {clanInfo.name}
              </Badge>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="members" className="gap-1.5">
                <Users className="w-3.5 h-3.5" />
                멤버 현황
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5">
                <Check className="w-3.5 h-3.5" />
                가입 신청 {requests.length > 0 && `(${requests.length})`}
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-1.5">
                <Info className="w-3.5 h-3.5" />
                클랜 정보
              </TabsTrigger>
            </TabsList>

            {/* 멤버 현황 탭 */}
            <TabsContent value="members" className="space-y-4 mt-4">
              {/* 멤버 통계 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-yellow-500/20 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">마스터</p>
                  <p className="text-lg font-black text-yellow-500">{groupedMembers.MASTER.length}</p>
                </div>
                <div className="bg-card border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">운영진</p>
                  <p className="text-lg font-black text-blue-500">{groupedMembers.MANAGER.length}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">멤버</p>
                  <p className="text-lg font-black text-foreground">{groupedMembers.MEMBER.length}</p>
                </div>
              </div>

              {isLoading ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">로딩 중...</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* 마스터 */}
                  {groupedMembers.MASTER.length > 0 && (
                    <Card className="bg-card border-yellow-500/30">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-500" /> 마스터
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {groupedMembers.MASTER.map(member => (
                          <MemberRow
                            key={member.id}
                            member={member}
                            isMaster={isMaster}
                            canManage={false}
                            isMe={member.userId === user?.id}
                            onRoleChange={handleRoleChange}
                            onKick={handleKick}
                            onTransferMaster={handleTransferMaster}
                            getRoleIcon={getRoleIcon}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* 운영진 */}
                  {groupedMembers.MANAGER.length > 0 && (
                    <Card className="bg-card border-blue-500/30">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" /> 운영진 ({groupedMembers.MANAGER.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {groupedMembers.MANAGER.map(member => (
                          <MemberRow
                            key={member.id}
                            member={member}
                            isMaster={isMaster}
                            canManage={isMaster}
                            isMe={member.userId === user?.id}
                            onRoleChange={handleRoleChange}
                            onKick={handleKick}
                            onTransferMaster={handleTransferMaster}
                            getRoleIcon={getRoleIcon}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* 일반 멤버 */}
                  <Card className="bg-card border-border">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" /> 멤버 ({groupedMembers.MEMBER.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {groupedMembers.MEMBER.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground text-sm">일반 멤버가 없습니다.</p>
                      ) : (
                        groupedMembers.MEMBER.map(member => (
                          <MemberRow
                            key={member.id}
                            member={member}
                            isMaster={isMaster}
                            canManage={canManageMembers}
                            isMe={member.userId === user?.id}
                            onRoleChange={handleRoleChange}
                            onKick={handleKick}
                            onTransferMaster={handleTransferMaster}
                            getRoleIcon={getRoleIcon}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* 가입 신청 탭 */}
            <TabsContent value="requests" className="mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">가입 신청 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-8 text-muted-foreground">로딩 중...</p>
                  ) : requests.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">대기 중인 가입 신청이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {requests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm">{req.user?.battleTag}</p>
                              <p className="text-xs text-muted-foreground">{req.message || "인사말 없음"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground font-bold h-8 px-3"
                              onClick={() => handleRequestAction(req.id, 'approve')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive/10 font-bold h-8 px-3"
                              onClick={() => handleRequestAction(req.id, 'reject')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 클랜 정보 탭 */}
            <TabsContent value="info" className="mt-4 space-y-4">
              {/* 클랜 기본 정보 */}
              <Card className="bg-card border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" /> 클랜 기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">클랜 태그 (변경 불가)</Label>
                    <Input
                      value={clanInfo?.tag || ""}
                      disabled
                      className="bg-muted/20 border-border/50 opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-primary">클랜명</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={!isMaster}
                      className="bg-input border-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-primary">클랜 소개</Label>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="클랜 소개를 입력하세요"
                      disabled={!isMaster}
                      className="bg-input border-border focus:border-primary"
                    />
                  </div>

                  {isMaster && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        onClick={handleUpdateClanInfo}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground font-bold gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? "저장 중..." : "변경사항 저장"}
                      </Button>
                    </div>
                  )}

                  {!isMaster && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      클랜 정보 수정은 마스터만 가능합니다.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 클랜 현황 요약 */}
              <Card className="bg-card border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> 클랜 현황
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">전체 멤버</span>
                    <span className="font-bold text-foreground">{members.length}명</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">마스터</span>
                    <span className="font-bold text-yellow-500">
                      {groupedMembers.MASTER[0]?.user?.battleTag || "미지정"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">운영진</span>
                    <span className="font-bold text-blue-500">
                      {groupedMembers.MANAGER.length > 0
                        ? groupedMembers.MANAGER.map(m => m.user?.battleTag).join(", ")
                        : "없음"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">대기 중인 가입 신청</span>
                    <span className="font-bold text-primary">{requests.length}건</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">내 역할</span>
                    <Badge
                      variant="outline"
                      className={
                        myMembership?.role === "MASTER"
                          ? "border-yellow-500/50 text-yellow-500"
                          : myMembership?.role === "MANAGER"
                            ? "border-blue-500/50 text-blue-500"
                            : "border-border text-muted-foreground"
                      }
                    >
                      {myMembership?.role === "MASTER" ? "마스터" : myMembership?.role === "MANAGER" ? "운영진" : "멤버"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  )
}

interface MemberRowProps {
  member: ClanMember
  isMaster: boolean
  canManage: boolean
  isMe: boolean
  onRoleChange: (userId: string, role: ClanRole) => void
  onKick: (userId: string, battleTag: string) => void
  onTransferMaster: (userId: string, battleTag: string) => void
  getRoleIcon: (role: ClanRole) => React.ReactNode
}

function MemberRow({ member, isMaster, canManage, isMe, onRoleChange, onKick, onTransferMaster, getRoleIcon }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          {getRoleIcon(member.role)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm">{member.user?.battleTag}</p>
            {isMe && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">나</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {member.user?.mainRole || "FLEX"} · {member.totalPoints.toLocaleString()}P
          </p>
        </div>
      </div>

      {canManage && member.role !== "MASTER" && (
        <div className="flex items-center gap-2">
          {isMaster && (
            <>
              <Select
                value={member.role}
                onValueChange={(value) => onRoleChange(member.userId, value as ClanRole)}
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">운영진</SelectItem>
                  <SelectItem value="MEMBER">멤버</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-yellow-500 hover:text-yellow-400"
                onClick={() => onTransferMaster(member.userId, member.user?.battleTag)}
                title="마스터 양도"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-destructive hover:text-destructive"
            onClick={() => onKick(member.userId, member.user?.battleTag)}
            title="추방"
          >
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
