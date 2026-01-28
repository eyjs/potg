import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/components/ui/select'
import { Crown, Shield, User, UserX, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClanRole, ClanMember, MainRole } from '../types'
import { POSITION_LABELS } from '../types'

interface MemberRowProps {
  member: ClanMember
  isMaster: boolean
  canManage: boolean
  isMe: boolean
  onRoleChange: (userId: string, role: ClanRole) => void
  onKick: (userId: string, battleTag: string) => void
  onTransferMaster: (userId: string, battleTag: string) => void
}

function getRoleIcon(role: ClanRole) {
  switch (role) {
    case 'MASTER':
      return <Crown className="w-4 h-4 text-yellow-500" />
    case 'MANAGER':
      return <Shield className="w-4 h-4 text-blue-500" />
    default:
      return <User className="w-4 h-4 text-muted-foreground" />
  }
}

function getPositionColor(mainRole: MainRole): string {
  switch (mainRole) {
    case 'TANK':
      return 'text-blue-500'
    case 'DPS':
      return 'text-ow-red'
    case 'SUPPORT':
      return 'text-green-500'
    default:
      return 'text-ow-gold'
  }
}

export function MemberRow({
  member,
  isMaster,
  canManage,
  isMe,
  onRoleChange,
  onKick,
  onTransferMaster,
}: MemberRowProps) {
  const position = member.user?.mainRole || 'FLEX'

  return (
    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          {getRoleIcon(member.role)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">
              {member.user?.battleTag || '알 수 없음'}
            </p>
            {isMe && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary shrink-0">
                나
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className={cn(getPositionColor(position))}>
              {POSITION_LABELS[position] || position}
            </span>
            {' · '}
            {member.totalPoints.toLocaleString()}P
          </p>
        </div>
      </div>

      {canManage && member.role !== 'MASTER' && (
        <div className="flex items-center gap-2 shrink-0">
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
                onClick={() => onTransferMaster(member.userId, member.user?.battleTag || '알 수 없음')}
                title="마스터 양도"
                aria-label="마스터 양도"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-destructive hover:text-destructive"
            onClick={() => onKick(member.userId, member.user?.battleTag || '알 수 없음')}
            title="추방"
            aria-label="추방"
          >
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
