import { cn } from '@/lib/utils'
import { Users, Shield, Coins, UserPlus } from 'lucide-react'
import type { GroupedMembers } from '../types'

interface ClanStatsRowProps {
  memberCount: number
  groupedMembers: GroupedMembers
  totalPoints: number
  pendingRequests: number
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: string
  borderColor?: string
}

function StatCard({ label, value, icon, accent, borderColor }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-4 flex items-center gap-3',
        borderColor || 'border-border',
      )}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', accent || 'bg-muted/30')}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
          {label}
        </p>
        <p className="text-lg font-black text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function ClanStatsRow({
  memberCount,
  groupedMembers,
  totalPoints,
  pendingRequests,
}: ClanStatsRowProps) {
  const managerCount = groupedMembers.MASTER.length + groupedMembers.MANAGER.length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="총 멤버"
        value={memberCount}
        icon={<Users className="w-5 h-5 text-foreground" />}
        accent="bg-muted/30"
        borderColor="border-border"
      />
      <StatCard
        label="운영진"
        value={managerCount}
        icon={<Shield className="w-5 h-5 text-blue-500" />}
        accent="bg-blue-500/10"
        borderColor="border-blue-500/20"
      />
      <StatCard
        label="총 포인트"
        value={totalPoints.toLocaleString()}
        icon={<Coins className="w-5 h-5 text-primary" />}
        accent="bg-primary/10"
        borderColor="border-primary/20"
      />
      <StatCard
        label="가입 대기"
        value={pendingRequests}
        icon={<UserPlus className="w-5 h-5 text-green-500" />}
        accent="bg-green-500/10"
        borderColor={pendingRequests > 0 ? 'border-green-500/30' : 'border-border'}
      />
    </div>
  )
}
