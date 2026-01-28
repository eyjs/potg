"use client"

import { useState, useEffect } from "react"
import { Clock, UserPlus, UserMinus, Users, CheckCircle2, Shield, Crosshair, Heart } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/common/components/ui/dialog"
import { useDialog } from "@/common/hooks/use-dialog"
import { cn } from "@/lib/utils"

interface SignupCountdownProps {
  deadline: string
  participantCount: number
  maxPlayers: number
  isJoined: boolean
  isCheckedIn: boolean
  checkInStart?: string | null
  scrimStatus: string
  onSignup: (preferredRoles: string[], note: string) => void
  onLeave: () => void
  onCheckIn: () => void
}

function calcRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return null
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { hours, minutes, seconds }
}

const ROLES = [
  { key: "TANK", label: "탱커", icon: Shield, color: "text-yellow-500 border-yellow-500/50 bg-yellow-500/10" },
  { key: "DPS", label: "딜러", icon: Crosshair, color: "text-red-500 border-red-500/50 bg-red-500/10" },
  { key: "SUPPORT", label: "서포터", icon: Heart, color: "text-green-500 border-green-500/50 bg-green-500/10" },
]

function SignupDialog({
  dialog,
  onSubmit,
}: {
  dialog: ReturnType<typeof useDialog>
  onSubmit: (roles: string[], note: string) => void
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [note, setNote] = useState("")

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const handleSubmit = () => {
    onSubmit(selectedRoles, note)
    dialog.close()
    setSelectedRoles([])
    setNote("")
  }

  return (
    <Dialog {...dialog.dialogProps}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold italic uppercase tracking-wide text-foreground">
            참가 신청
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">선호 역할 (선택)</p>
            <div className="flex gap-2">
              {ROLES.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => toggleRole(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-sm border text-sm font-bold transition-all",
                    selectedRoles.includes(key)
                      ? color
                      : "border-border/50 text-muted-foreground bg-muted/30"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">메모 (선택)</p>
            <input
              type="text"
              placeholder="늦을 수 있어요, 서포터 원해요 등"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-sm border border-border/50 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              maxLength={100}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => dialog.close()}>
              취소
            </Button>
            <Button
              className="flex-1 skew-btn bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={handleSubmit}
            >
              <span>참가 신청</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SignupCountdown({
  deadline,
  participantCount,
  maxPlayers,
  isJoined,
  isCheckedIn,
  checkInStart,
  scrimStatus,
  onSignup,
  onLeave,
  onCheckIn,
}: SignupCountdownProps) {
  const [remaining, setRemaining] = useState(calcRemaining(deadline))
  const signupDialog = useDialog()

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining(deadline))
    }, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  const isExpired = !remaining
  const isFull = participantCount >= maxPlayers

  const canCheckIn =
    isJoined &&
    !isCheckedIn &&
    (scrimStatus === "scheduled" || scrimStatus === "in_progress") &&
    (!checkInStart || new Date() >= new Date(checkInStart))

  return (
    <>
      <Card className="border-2 border-primary/30 bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                  참가 신청
                </span>
                {isExpired ? (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">마감됨</Badge>
                ) : isFull ? (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">만석</Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                    신청중
                  </Badge>
                )}
              </div>
              {isExpired ? (
                <p className="text-sm text-muted-foreground">신청이 마감되었습니다</p>
              ) : (
                <p className="text-lg font-black italic text-primary tabular-nums">
                  {String(remaining.hours).padStart(2, "0")}:{String(remaining.minutes).padStart(2, "0")}:{String(remaining.seconds).padStart(2, "0")}
                  <span className="text-xs font-normal text-muted-foreground ml-2 not-italic">남음</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="font-semibold">{participantCount}/{maxPlayers}명</span>
              </div>

              {canCheckIn && (
                <Button
                  size="sm"
                  onClick={onCheckIn}
                  className="skew-btn bg-green-600 text-white font-bold hover:bg-green-500"
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    체크인
                  </span>
                </Button>
              )}

              {isJoined && isCheckedIn && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  체크인 완료
                </Badge>
              )}

              {!isExpired && !isFull && (
                isJoined ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLeave}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    참가 취소
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => signupDialog.open()}
                    className="skew-btn bg-primary text-primary-foreground font-bold"
                  >
                    <span className="flex items-center gap-1">
                      <UserPlus className="w-4 h-4" />
                      참가 신청
                    </span>
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SignupDialog dialog={signupDialog} onSubmit={onSignup} />
    </>
  )
}
