import { Card, CardContent } from '@/common/components/ui/card'
import { Swords, Trophy, Users, Target } from 'lucide-react'

interface SummaryCardsProps {
  totalScrims: number
  finishedCount: number
  playerCount: number
  totalParticipations: number
}

export function SummaryCards({
  totalScrims,
  finishedCount,
  playerCount,
  totalParticipations,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-card border-primary/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Swords className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{totalScrims}</p>
            <p className="text-xs text-muted-foreground">총 내전</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-green-500/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{finishedCount}</p>
            <p className="text-xs text-muted-foreground">완료된 내전</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-blue-500/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{playerCount}</p>
            <p className="text-xs text-muted-foreground">클랜원</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-accent/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{totalParticipations}</p>
            <p className="text-xs text-muted-foreground">총 참가</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
