import { Button } from '@/common/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Badge } from '@/common/components/ui/badge'
import { Info, Save, Users } from 'lucide-react'
import type { ClanInfo, GroupedMembers } from '../types'

interface ClanSettingsFormProps {
  clanInfo: ClanInfo | null
  editName: string
  setEditName: (name: string) => void
  editDescription: string
  setEditDescription: (desc: string) => void
  isMaster: boolean
  isSaving: boolean
  onSave: () => void
  members: { length: number }
  groupedMembers: GroupedMembers
  requests: { length: number }
  myRole?: string
}

export function ClanSettingsForm({
  clanInfo,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  isMaster,
  isSaving,
  onSave,
  members,
  groupedMembers,
  requests,
  myRole,
}: ClanSettingsFormProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> 클랜 기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">
              클랜 태그 (변경 불가)
            </Label>
            <Input
              value={clanInfo?.tag || ''}
              disabled
              className="bg-muted/20 border-border/50 opacity-50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-primary">클랜명</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={!isMaster}
              className="bg-input border-border focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-primary">클랜 소개</Label>
            <Input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="클랜 소개를 입력하세요"
              disabled={!isMaster}
              className="bg-input border-border focus:border-primary"
            />
          </div>

          {isMaster && (
            <div className="pt-2 flex justify-end">
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="bg-primary text-primary-foreground font-bold gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '저장 중...' : '변경사항 저장'}
              </Button>
            </div>
          )}

          {!isMaster && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              클랜 정보 수정은 마스터만 가능합니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> 클랜 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <span className="text-sm text-muted-foreground">전체 멤버</span>
            <span className="font-bold text-foreground">{members.length}명</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <span className="text-sm text-muted-foreground">마스터</span>
            <span className="font-bold text-yellow-500">
              {groupedMembers.MASTER[0]?.user?.battleTag || '미지정'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <span className="text-sm text-muted-foreground">운영진</span>
            <span className="font-bold text-blue-500">
              {groupedMembers.MANAGER.length > 0
                ? groupedMembers.MANAGER.map((m) => m.user?.battleTag).join(', ')
                : '없음'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <span className="text-sm text-muted-foreground">대기 중인 가입 신청</span>
            <span className="font-bold text-primary">{requests.length}건</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <span className="text-sm text-muted-foreground">내 역할</span>
            <Badge
              variant="outline"
              className={
                myRole === 'MASTER'
                  ? 'border-yellow-500/50 text-yellow-500'
                  : myRole === 'MANAGER'
                    ? 'border-blue-500/50 text-blue-500'
                    : 'border-border text-muted-foreground'
              }
            >
              {myRole === 'MASTER' ? '마스터' : myRole === 'MANAGER' ? '운영진' : '멤버'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
