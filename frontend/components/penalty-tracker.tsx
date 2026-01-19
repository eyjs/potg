import { AlertTriangle, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PenaltyUser {
  id: string
  name: string
  points: number
  reason: string
}

interface PenaltyTrackerProps {
  users: PenaltyUser[]
}

export function PenaltyTracker({ users }: PenaltyTrackerProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive font-bold italic uppercase tracking-wide">
          <AlertTriangle className="w-5 h-5" />
          현상수배
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">현재 패널티 대상자가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 bg-card/50 border border-destructive/20 rounded"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.reason}</p>
                  </div>
                </div>
                <span className="text-destructive font-bold text-sm">{user.points}P</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
