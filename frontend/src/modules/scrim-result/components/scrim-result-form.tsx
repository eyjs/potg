"use client"

import { useState, useEffect } from "react"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useCreateScrimResult, useConfirmScrimResult } from "../hooks/use-scrim-result"
import api from "@/lib/api"
import type { TeamRanking } from "../types"

interface AuctionParticipant {
  userId: string
  role: "CAPTAIN" | "PLAYER"
  assignedTeamCaptainId: string | null
  user: {
    nickname: string | null
    battleTag: string
  }
}

interface ScrimResultFormProps {
  auctionId: string
}

export function ScrimResultForm({ auctionId }: ScrimResultFormProps) {
  const [captains, setCaptains] = useState<AuctionParticipant[]>([])
  const [rankings, setRankings] = useState<TeamRanking[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true)
  const createResult = useCreateScrimResult()
  const confirmResult = useConfirmScrimResult()

  useEffect(() => {
    loadParticipants()
  }, [auctionId])

  const loadParticipants = async () => {
    try {
      const res = await api.get(`/auctions/${auctionId}`)
      const participants: AuctionParticipant[] = res.data.participants ?? []
      const captainsList = participants.filter((p) => p.role === "CAPTAIN")
      setCaptains(captainsList)

      // Initialize rankings with default values
      setRankings(
        captainsList.map((c, index) => ({
          teamCaptainId: c.userId,
          rank: index + 1,
          points: 0,
        })),
      )
    } catch {
      toast.error("경매 정보를 불러오는데 실패했습니다")
    } finally {
      setIsLoadingParticipants(false)
    }
  }

  const updateRank = (captainId: string, rank: number) => {
    setRankings((prev) =>
      prev.map((r) => (r.teamCaptainId === captainId ? { ...r, rank } : r)),
    )
  }

  const updatePoints = (captainId: string, points: number) => {
    setRankings((prev) =>
      prev.map((r) => (r.teamCaptainId === captainId ? { ...r, points } : r)),
    )
  }

  const getCaptainName = (captain: AuctionParticipant): string => {
    return captain.user?.nickname || captain.user?.battleTag?.split("#")[0] || "Unknown"
  }

  const handleSubmit = async () => {
    // Validate that all teams have ranks and points
    const hasInvalidRank = rankings.some((r) => r.rank < 1 || r.rank > captains.length)
    if (hasInvalidRank) {
      toast.error("모든 팀의 순위를 올바르게 입력해주세요")
      return
    }

    const hasZeroPoints = rankings.some((r) => r.points <= 0)
    if (hasZeroPoints) {
      toast.error("모든 팀에 포인트를 입력해주세요")
      return
    }

    // Check for duplicate ranks
    const ranks = rankings.map((r) => r.rank)
    const hasDuplicateRanks = new Set(ranks).size !== ranks.length
    if (hasDuplicateRanks) {
      toast.error("순위가 중복되었습니다")
      return
    }

    try {
      const result = await createResult.mutateAsync({
        auctionId,
        rankings,
      })

      // Auto-confirm
      const shouldConfirm = window.confirm(
        "결과를 즉시 확정하고 포인트를 지급하시겠습니까?\n\n확정 후에는 수정할 수 없습니다.",
      )

      if (shouldConfirm && result.id) {
        await confirmResult.mutateAsync(result.id)
        toast.success("내전 결과가 확정되고 포인트가 지급되었습니다")
      } else {
        toast.success("내전 결과가 임시 저장되었습니다")
      }
    } catch {
      toast.error("내전 결과 등록에 실패했습니다")
    }
  }

  if (isLoadingParticipants) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (captains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
        <p className="text-sm">경매 참가자 정보를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
        내전 결과 입력
      </h3>

      <div className="space-y-3">
        {captains.map((captain) => {
          const ranking = rankings.find((r) => r.teamCaptainId === captain.userId)

          return (
            <div
              key={captain.userId}
              className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-3"
            >
              <div className="font-semibold text-sm">
                {getCaptainName(captain)} 팀
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    순위
                  </label>
                  <select
                    value={ranking?.rank ?? 1}
                    onChange={(e) => updateRank(captain.userId, Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-border/50 bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {Array.from({ length: captains.length }, (_, i) => i + 1).map(
                      (rank) => (
                        <option key={rank} value={rank}>
                          {rank}등
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    기본 포인트
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={ranking?.points ?? 0}
                    onChange={(e) =>
                      updatePoints(captain.userId, Math.max(0, Number(e.target.value)))
                    }
                    className="bg-muted/30 border-border/50"
                    placeholder="포인트"
                  />
                </div>
              </div>

              {/* Preview */}
              {ranking && ranking.points > 0 && (
                <div className="text-xs text-muted-foreground">
                  팀장: +{ranking.points * 2}p (x2) / 팀원: +{ranking.points}p
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createResult.isPending || confirmResult.isPending}
        className="w-full h-12 text-base font-bold"
      >
        {createResult.isPending || confirmResult.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "결과 등록"
        )}
      </Button>
    </div>
  )
}
