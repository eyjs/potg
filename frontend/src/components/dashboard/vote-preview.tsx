"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { VoteCard } from "@/modules/vote/components/vote-card"
import { Button } from "@/common/components/ui/button"

interface Vote {
  id: string
  title: string
  deadline: string
  status: string
  options?: Array<{ label: string; count: number; id: string }>
  userSelection?: string
  maxParticipants?: number
}

interface VotePreviewProps {
  votes: Vote[]
  isAdmin: boolean
  onVote: (voteId: string, type: "attend" | "absent" | "late") => void
  onDelete: (id: string) => void
  onClose: (id: string) => void
  onEdit: (id: string) => void
}

export function VotePreview({
  votes,
  isAdmin,
  onVote,
  onDelete,
  onClose,
  onEdit,
}: VotePreviewProps) {
  const recentVotes = votes.slice(0, 2)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground">
          최신 <span className="text-primary">투표</span>
        </h2>
        {votes.length > 2 && (
          <Link href="/vote">
            <Button variant="ghost" className="gap-2 text-primary hover:text-primary/80">
              전체 투표 보기
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>

      {votes.length === 0 ? (
        <div className="p-8 md:p-12 border-2 border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">🗳️</span>
          </div>
          <div>
            <p className="text-foreground font-bold uppercase italic">등록된 투표가 없습니다</p>
            <p className="text-muted-foreground text-sm">새로운 투표를 생성하여 의견을 모아보세요.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentVotes.map((vote) => {
            const selectionMap: Record<string, "attend" | "absent" | "late"> = {
              "참석": "attend",
              "불참": "absent",
              "지각": "late"
            }

            return (
              <VoteCard
                key={vote.id}
                id={vote.id}
                title={vote.title}
                deadline={new Date(vote.deadline).toLocaleDateString()}
                currentVotes={vote.options?.reduce((sum, opt) => sum + opt.count, 0) || 0}
                maxVotes={vote.maxParticipants || 20}
                status={vote.status === 'OPEN' ? 'open' : 'closed'}
                isAdmin={isAdmin}
                userVote={vote.userSelection ? selectionMap[vote.userSelection] : null}
                onVote={(type) => onVote(vote.id, type)}
                onDelete={() => onDelete(vote.id)}
                onClose={() => onClose(vote.id)}
                onEdit={() => onEdit(vote.id)}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
