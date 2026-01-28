import { Button } from '@/common/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Check, X, User, Inbox } from 'lucide-react'
import type { JoinRequest } from '../types'

interface JoinRequestListProps {
  requests: JoinRequest[]
  isLoading: boolean
  onAction: (requestId: string, action: 'approve' | 'reject') => void
}

export function JoinRequestList({ requests, isLoading, onAction }: JoinRequestListProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Inbox className="w-10 h-10 opacity-40" />
            <p className="text-sm">대기 중인 가입 신청이 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">
          가입 신청 목록 ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">
                    {req.user?.battleTag || '알 수 없음'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {req.message || '인사말 없음'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold h-8 px-3"
                  onClick={() => onAction(req.id, 'approve')}
                  aria-label="승인"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10 font-bold h-8 px-3"
                  onClick={() => onAction(req.id, 'reject')}
                  aria-label="거절"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
