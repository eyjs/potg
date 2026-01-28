'use client'

import { Header } from '@/common/layouts/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/common/components/ui/tabs'
import { AuthGuard } from '@/common/components/auth-guard'
import { Users, Check, Info, Coins, CalendarDays } from 'lucide-react'
import { useClanManage } from '@/modules/clan/hooks/use-clan-manage'
import { ClanHeroBanner } from '@/modules/clan/components/clan-hero-banner'
import { ClanStatsRow } from '@/modules/clan/components/clan-stats-row'
import { MemberTable } from '@/modules/clan/components/member-table'
import { JoinRequestList } from '@/modules/clan/components/join-request-list'
import { ClanSettingsForm } from '@/modules/clan/components/clan-settings-form'
import { ClanCharts } from '@/modules/clan/components/clan-charts'
import { ActivitySidebar } from '@/modules/clan/components/activity-sidebar'
import { PointRulesPanel } from '@/modules/attendance/components/point-rules-panel'
import { AttendanceHistoryPanel } from '@/modules/attendance/components/attendance-history-panel'
import { AttendanceStatsPanel } from '@/modules/attendance/components/attendance-stats-panel'
import { useAttendance } from '@/modules/attendance/hooks/use-attendance'

export default function ClanManagePage() {
  const {
    user,
    requests,
    members,
    myMembership,
    clanInfo,
    isLoading,
    activeTab,
    setActiveTab,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    isSaving,
    canManageMembers,
    isMaster,
    groupedMembers,
    totalPoints,
    handleRequestAction,
    handleRoleChange,
    handleKick,
    handleTransferMaster,
    handleUpdateClanInfo,
  } = useClanManage()

  const {
    records: attendanceRecords,
    stats: attendanceStats,
    isLoading: isAttendanceLoading,
    isStatsLoading,
  } = useAttendance(user?.clanId)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-6xl mx-auto space-y-6">
          {/* 히어로 배너 */}
          <ClanHeroBanner
            clanInfo={clanInfo}
            memberCount={members.length}
            isLoading={isLoading}
          />

          {/* Quick Stats */}
          <ClanStatsRow
            memberCount={members.length}
            groupedMembers={groupedMembers}
            totalPoints={totalPoints}
            pendingRequests={requests.length}
          />

          {/* 메인 콘텐츠 + 사이드바 */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-w-0 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="members" className="gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    멤버 관리
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    가입 신청 {requests.length > 0 && `(${requests.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="info" className="gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    클랜 설정
                  </TabsTrigger>
                  <TabsTrigger value="point-rules" className="gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    포인트 규칙
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    출석 관리
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="space-y-4 mt-4">
                  <MemberTable
                    members={members}
                    groupedMembers={groupedMembers}
                    isLoading={isLoading}
                    isMaster={isMaster}
                    canManageMembers={canManageMembers}
                    currentUserId={user?.id}
                    onRoleChange={handleRoleChange}
                    onKick={handleKick}
                    onTransferMaster={handleTransferMaster}
                  />
                </TabsContent>

                <TabsContent value="requests" className="mt-4">
                  <JoinRequestList
                    requests={requests}
                    isLoading={isLoading}
                    onAction={handleRequestAction}
                  />
                </TabsContent>

                <TabsContent value="info" className="mt-4">
                  <ClanSettingsForm
                    clanInfo={clanInfo}
                    editName={editName}
                    setEditName={setEditName}
                    editDescription={editDescription}
                    setEditDescription={setEditDescription}
                    isMaster={isMaster}
                    isSaving={isSaving}
                    onSave={handleUpdateClanInfo}
                    members={members}
                    groupedMembers={groupedMembers}
                    requests={requests}
                    myRole={myMembership?.role}
                  />
                </TabsContent>

                <TabsContent value="point-rules" className="mt-4">
                  <PointRulesPanel
                    clanId={user?.clanId}
                    canManage={canManageMembers}
                  />
                </TabsContent>

                <TabsContent value="attendance" className="space-y-6 mt-4">
                  <AttendanceStatsPanel
                    stats={attendanceStats}
                    isLoading={isStatsLoading}
                  />
                  <AttendanceHistoryPanel
                    records={attendanceRecords}
                    isLoading={isAttendanceLoading}
                  />
                </TabsContent>
              </Tabs>

              {/* 차트 */}
              <ClanCharts members={members} groupedMembers={groupedMembers} />
            </div>

            {/* 사이드바 */}
            <div className="w-full lg:w-80 lg:shrink-0">
              <div className="lg:sticky lg:top-6">
                <ActivitySidebar clanId={user?.clanId} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
