"use client"

import { useState } from "react"
import { useDialog } from "@/common/hooks/use-dialog"
import { ChevronLeft, ChevronRight, X, Shield, Crosshair, Heart, Download, Shuffle, Users, CheckCircle2 } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  avatar: string
  role: "tank" | "dps" | "support" | "flex"
  checkedIn?: boolean
  preferredRoles?: string[]
  note?: string
}

interface RosterSectionProps {
  teamA: Member[]
  teamB: Member[]
  pool: Member[]
  isAdmin: boolean
  hasAuction?: boolean
  onMoveToTeam: (memberId: string, team: "A" | "B") => void
  onMoveToPool: (memberId: string) => void
  onImportFromAuction?: () => void
  onShuffleTeams?: () => void
}

const roleIcons: Record<string, typeof Shield> = {
  tank: Shield,
  dps: Crosshair,
  support: Heart,
  flex: Users,
}

const roleColors: Record<string, string> = {
  tank: "text-yellow-500",
  dps: "text-red-500",
  support: "text-green-500",
  flex: "text-muted-foreground",
}

const preferredRoleIcons: Record<string, typeof Shield> = {
  TANK: Shield,
  DPS: Crosshair,
  SUPPORT: Heart,
}

const preferredRoleColors: Record<string, string> = {
  TANK: "text-yellow-500",
  DPS: "text-red-500",
  SUPPORT: "text-green-500",
}

function PoolMemberCard({
  member,
  isAdmin,
  onMoveLeft,
  onMoveRight,
}: {
  member: Member
  isAdmin: boolean
  onMoveLeft: () => void
  onMoveRight: () => void
}) {
  const RoleIcon = roleIcons[member.role] ?? Shield

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-sm border border-border/50 group hover:bg-muted/80 transition-colors">
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-accent hover:text-accent hover:bg-accent/20 opacity-50 group-hover:opacity-100 transition-opacity"
          onClick={onMoveLeft}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      )}

      <div className="relative flex-shrink-0">
        <Avatar className="h-9 w-9 border-2 border-border">
          <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
          <AvatarFallback className="bg-muted text-foreground font-bold text-xs">
            {member.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        {member.checkedIn && (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 absolute -bottom-0.5 -right-0.5" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-center">
        <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
        <div className="flex items-center justify-center gap-1">
          {member.preferredRoles && member.preferredRoles.length > 0 ? (
            member.preferredRoles.map((r) => {
              const PrefIcon = preferredRoleIcons[r]
              return PrefIcon ? (
                <PrefIcon key={r} className={cn("w-3 h-3", preferredRoleColors[r])} />
              ) : null
            })
          ) : (
            <>
              <RoleIcon className={cn("w-3 h-3", roleColors[member.role] ?? "text-muted-foreground")} />
              <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
            </>
          )}
        </div>
        {member.note && (
          <p className="text-xs text-muted-foreground truncate">{member.note}</p>
        )}
      </div>

      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/20 opacity-50 group-hover:opacity-100 transition-opacity"
          onClick={onMoveRight}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}

function TeamMemberCard({
  member,
  isAdmin,
  onRemove,
}: {
  member: Member
  isAdmin: boolean
  onRemove: () => void
}) {
  const RoleIcon = roleIcons[member.role] ?? Shield

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-sm border border-border/50 group">
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10 border-2 border-border">
          <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
          <AvatarFallback className="bg-muted text-foreground font-bold">{member.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        {member.checkedIn && (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 absolute -bottom-0.5 -right-0.5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
        <div className="flex items-center gap-1">
          <RoleIcon className={cn("w-3 h-3", roleColors[member.role] ?? "text-muted-foreground")} />
          <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
        </div>
      </div>
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onRemove}
          title="대기 명단으로 되돌리기"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

function ImportAuctionDialog({ onImport, hasAuction }: { onImport: () => void; hasAuction: boolean }) {
  const dialog = useDialog()

  const handleImport = () => {
    onImport()
    dialog.close()
  }

  return (
    <Dialog {...dialog.dialogProps}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/50 text-muted-foreground hover:text-foreground bg-transparent disabled:opacity-50"
          disabled={!hasAuction}
          title={!hasAuction ? "이 스크림은 경매와 연결되어 있지 않습니다" : ""}
        >
          <Download className="w-4 h-4" />
          Import from Auction
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-bold italic uppercase tracking-wide text-foreground">
            경매 결과 불러오기
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            연결된 경매의 참가자를 대기 명단으로 불러옵니다.
          </p>
          <p className="text-sm text-yellow-500 font-semibold">
            현재 대기 명단의 경매 출처 참가자는 초기화됩니다.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => dialog.close()}>
              취소
            </Button>
            <Button
              className="flex-1 skew-btn bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleImport}
            >
              <span>불러오기</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RosterSection({
  teamA,
  teamB,
  pool,
  isAdmin,
  hasAuction = false,
  onMoveToTeam,
  onMoveToPool,
  onImportFromAuction,
  onShuffleTeams,
}: RosterSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-primary pl-3">
          팀 배정
        </h2>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {onShuffleTeams && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border/50 text-muted-foreground hover:text-foreground bg-transparent"
                onClick={onShuffleTeams}
              >
                <Shuffle className="w-4 h-4" />
                랜덤 섞기
              </Button>
            )}
            {onImportFromAuction && <ImportAuctionDialog onImport={onImportFromAuction} hasAuction={hasAuction} />}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1fr] gap-4">
        {/* Team A Column */}
        <Card className="border-2 border-accent/50 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-accent rounded-full" />
              <h3 className="font-bold text-lg italic uppercase tracking-wide text-accent">Team A</h3>
              <span className="text-sm text-muted-foreground">({teamA.length}명)</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 min-h-[200px]">
            {teamA.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">멤버를 배정해주세요</p>
              </div>
            ) : (
              teamA.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  isAdmin={isAdmin}
                  onRemove={() => onMoveToPool(member.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Pool Column (Center) */}
        <Card className="border-2 border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-muted-foreground rounded-full" />
              <h3 className="font-bold text-lg italic uppercase tracking-wide text-muted-foreground">대기 명단</h3>
              <span className="text-sm text-muted-foreground">({pool.length}명)</span>
            </div>
            {isAdmin && pool.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">좌우 화살표를 클릭하여 팀에 배정하세요</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2 min-h-[200px]">
            {pool.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">모든 멤버가 배정됨</p>
              </div>
            ) : (
              pool.map((member) => (
                <PoolMemberCard
                  key={member.id}
                  member={member}
                  isAdmin={isAdmin}
                  onMoveLeft={() => onMoveToTeam(member.id, "A")}
                  onMoveRight={() => onMoveToTeam(member.id, "B")}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Team B Column */}
        <Card className="border-2 border-primary/50 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <h3 className="font-bold text-lg italic uppercase tracking-wide text-primary">Team B</h3>
              <span className="text-sm text-muted-foreground">({teamB.length}명)</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 min-h-[200px]">
            {teamB.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">멤버를 배정해주세요</p>
              </div>
            ) : (
              teamB.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  isAdmin={isAdmin}
                  onRemove={() => onMoveToPool(member.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
