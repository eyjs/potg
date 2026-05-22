'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { shopApi, type Order, type OrderStatus } from '@/modules/admin/api/shop'
import { DataTable, type ColumnDef } from '@/modules/admin/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: '대기중',
  DELIVERED: '전달완료',
  CANCELLED: '취소',
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: 'bg-primary/20 text-primary',
  DELIVERED: 'bg-green-900/30 text-green-400',
  CANCELLED: 'bg-destructive/20 text-destructive',
}

const ALL_STATUSES: Array<OrderStatus | 'ALL'> = ['ALL', 'PENDING', 'DELIVERED', 'CANCELLED']

type ActionType = 'deliver' | 'cancel'

interface ActionState {
  order: Order
  type: ActionType
}

const columns: ColumnDef<Order>[] = [
  {
    key: 'id',
    header: 'ID',
    render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>,
  },
  {
    key: 'username',
    header: '사용자',
    render: (r) => <span className="font-medium">{r.username ?? r.userId.slice(0, 8) + '…'}</span>,
  },
  {
    key: 'productName',
    header: '상품',
    render: (r) => <span>{r.productName}</span>,
  },
  {
    key: 'quantity',
    header: '수량',
    render: (r) => <span className="tabular-nums">{r.quantity}</span>,
  },
  {
    key: 'totalPrice',
    header: '총액',
    render: (r) => (
      <span className="tabular-nums font-bold text-primary">{r.totalPrice.toLocaleString()}P</span>
    ),
  },
  {
    key: 'status',
    header: '상태',
    render: (r) => (
      <span className={cn('px-2 py-0.5 rounded-sm text-xs font-bold', STATUS_CLASS[r.status])}>
        {STATUS_LABEL[r.status]}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: '주문일',
    render: (r) => (
      <span className="text-xs text-muted-foreground">
        {new Date(r.createdAt).toLocaleString('ko-KR')}
      </span>
    ),
  },
]

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [actionState, setActionState] = useState<ActionState | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => shopApi.listOrders(),
  })

  const filteredOrders = statusFilter === 'ALL'
    ? orders
    : orders.filter((o) => o.status === statusFilter)

  const openAction = (order: Order, type: ActionType) => {
    setActionState({ order, type })
    setAdminNote('')
  }

  const handleAction = async () => {
    if (!actionState) return
    setActionLoading(true)
    try {
      if (actionState.type === 'deliver') {
        await shopApi.deliverOrder(actionState.order.id, adminNote || undefined)
        toast.success('전달 완료 처리되었습니다.')
      } else {
        await shopApi.cancelOrder(actionState.order.id, adminNote || undefined)
        toast.success('주문이 취소되었습니다.')
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      setActionState(null)
    } catch {
      toast.error('처리에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const columnsWithActions: ColumnDef<Order>[] = [
    ...columns,
    {
      key: 'id',
      header: '액션',
      render: (r) => {
        if (r.status !== 'PENDING') {
          return (
            <span className="text-xs text-muted-foreground">
              {r.adminNote ?? '-'}
            </span>
          )
        }
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-[var(--ow-blue)] text-white hover:bg-[var(--ow-blue)]/80"
              onClick={() => openAction(r, 'deliver')}
              aria-label="전달 완료"
            >
              전달완료
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2 text-xs"
              onClick={() => openAction(r, 'cancel')}
              aria-label="취소"
            >
              취소
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black italic uppercase text-foreground">
        주문 관리
      </h1>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap" role="group" aria-label="상태 필터">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-sm text-xs font-semibold border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50',
            )}
            aria-pressed={statusFilter === s}
          >
            {s === 'ALL' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>전체 <span className="text-foreground font-bold">{orders.length}</span>건</span>
        <span>대기 <span className="text-primary font-bold">{orders.filter(o => o.status === 'PENDING').length}</span>건</span>
      </div>

      <DataTable
        columns={columnsWithActions}
        rows={filteredOrders}
        loading={isLoading}
        emptyMessage="주문이 없습니다."
      />

      {/* Action Dialog */}
      <Dialog open={!!actionState} onOpenChange={(o) => { if (!o) setActionState(null) }}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {actionState?.type === 'deliver' ? '전달 완료 처리' : '주문 취소'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionState && (
              <div className="bg-muted/30 rounded-sm p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">주문 ID:</span> {actionState.order.id.slice(0, 8)}…</p>
                <p><span className="text-muted-foreground">상품:</span> {actionState.order.productName}</p>
                <p><span className="text-muted-foreground">사용자:</span> {actionState.order.username ?? actionState.order.userId}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-note">관리자 메모 (선택)</Label>
              <Input
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={actionState?.type === 'deliver' ? '전달 완료 메모' : '취소 사유'}
              />
            </div>
            {actionState?.type === 'cancel' && (
              <p className="text-xs text-[var(--ow-red)]">
                취소 시 포인트가 자동 환불됩니다.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionState(null)} disabled={actionLoading}>
              취소
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              variant={actionState?.type === 'cancel' ? 'destructive' : 'default'}
            >
              {actionLoading ? '처리 중...' : actionState?.type === 'deliver' ? '전달 완료' : '주문 취소'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
