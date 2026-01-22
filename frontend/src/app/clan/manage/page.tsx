"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { Check, X, User, Crown, Shield, UserX, ArrowRightLeft } from "lucide-react"
import { toast } from "sonner"

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

export default function ClanManagePage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [members, setMembers] = useState<ClanMember[]>([])
  const [myMembership, setMyMembership] = useState<ClanMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("members")

  const fetchData = useCallback(async () => {
    if (!user?.clanId) return
    setIsLoading(true)
    try {
      const [requestsRes, membersRes, membershipRes] = await Promise.all([
        api.get(`/clans/${user.clanId}/requests`),
        api.get(`/clans/${user.clanId}/members`),
        api.get('/clans/membership/me'),
      ])
      setRequests(requestsRes.data)
      setMembers(membersRes.data)
      setMyMembership(membershipRes.data)
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

  const getRoleIcon = (role: ClanRole) => {
    switch (role) {
      case "MASTER": return <Crown className="w-4 h-4 text-yellow-500" />
      case "MANAGER": return <Shield className="w-4 h-4 text-blue-500" />
      default: return <User className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getRoleLabel = (role: ClanRole) => {
    switch (role) {
      case "MASTER": return "마스터"
      case "MANAGER": return "운영진"
      default: return "멤버"
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
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-foreground">
            클랜 <span className="text-primary">관리</span>
          </h1>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="members">멤버 관리</TabsTrigger>
              <TabsTrigger value="requests">
                가입 신청 {requests.length > 0 && `(${requests.length})`}
              </TabsTrigger>
            </TabsList>

            {/* 멤버 관리 탭 */}
            <TabsContent value="members" className="space-y-4 mt-4">
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
  onRoleChange: (userId: string, role: ClanRole) => void
  onKick: (userId: string, battleTag: string) => void
  onTransferMaster: (userId: string, battleTag: string) => void
  getRoleIcon: (role: ClanRole) => React.ReactNode
}

function MemberRow({ member, isMaster, canManage, onRoleChange, onKick, onTransferMaster, getRoleIcon }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          {getRoleIcon(member.role)}
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">{member.user?.battleTag}</p>
          <p className="text-xs text-muted-foreground">{member.totalPoints.toLocaleString()}P</p>
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
