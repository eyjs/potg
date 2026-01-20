"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X, Shield, Crosshair, Heart, Download, Shuffle, Users } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  avatar: string
  role: "tank" | "dps" | "support"
}

interface RosterSectionProps {
  teamA: Member[]
  teamB: Member[]
  pool: Member[]
  isAdmin: boolean
  onMoveToTeam: (memberId: string, team: "A" | "B") => void
  onMoveToPool: (memberId: string) => void
  onImportFromAuction?: () => void
  onShuffleTeams?: () => void
}

const roleIcons = {
  tank: Shield,
  dps: Crosshair,
  support: Heart,
}

const roleColors = {
  tank: "text-yellow-500",
  dps: "text-red-500",
  support: "text-green-500",
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
  const RoleIcon = roleIcons[member.role]

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

      <Avatar className="h-9 w-9 border-2 border-border flex-shrink-0">
        <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
        <AvatarFallback className="bg-muted text-foreground font-bold text-xs">
          {member.name.slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 text-center">
        <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
        <div className="flex items-center justify-center gap-1">
          <RoleIcon className={cn("w-3 h-3", roleColors[member.role])} />
          <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
        </div>
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
  const RoleIcon = roleIcons[member.role]

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-sm border border-border/50 group">
      <Avatar className="h-10 w-10 border-2 border-border">
        <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
        <AvatarFallback className="bg-muted text-foreground font-bold">{member.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
        <div className="flex items-center gap-1">
          <RoleIcon className={cn("w-3 h-3", roleColors[member.role])} />
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

function ImportAuctionDialog({ onImport }: { onImport: () => void }) {
  const [open, setOpen] = useState(false)

  const mockAuctionResults = [
    { teamName: "팀장A의 팀", members: ["김철수", "이영희", "박지민", "최수연", "정민호"] },
    { teamName: "팀장B의 팀", members: ["한소희", "윤성민", "강지우", "조현우", "임세라"] },
  ]

  const handleImport = () => {
    onImport()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/50 text-muted-foreground hover:text-foreground bg-transparent"
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
            최근 종료된 경매의 팀 구성을 불러옵니다. 현재 배정된 인원은 초기화됩니다.
          </p>

          <div className="space-y-3">
            {mockAuctionResults.map((team, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-sm border border-border/50">
                <p className={cn("font-bold text-sm mb-2", idx === 0 ? "text-accent" : "text-primary")}>
                  {team.teamName}
                </p>
                <div className="flex flex-wrap gap-1">
                  {team.members.map((name) => (
                    <span key={name} className="text-xs px-2 py-1 bg-background rounded-sm text-muted-foreground">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setOpen(false)}>
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
            {onImportFromAuction && <ImportAuctionDialog onImport={onImportFromAuction} />}
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
