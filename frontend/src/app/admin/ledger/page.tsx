'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ledgerApi, type PointTx } from '@/modules/admin/api/ledger'
import { DataTable, type ColumnDef } from '@/modules/admin/components/data-table'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/lib/utils'

const TAKE = 50

const REASON_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'ADMIN_ADJUST', label: '관리자 조정' },
  { value: 'BET_WIN', label: '베팅 승리' },
  { value: 'BET_LOSS', label: '베팅 패배' },
  { value: 'SCRIM_WIN', label: '내전 승리' },
  { value: 'SHOP_PURCHASE', label: '상점 구매' },
  { value: 'ATTENDANCE', label: '출석' },
  { value: 'SEND_TO', label: '송금' },
  { value: 'RECEIVE_FROM', label: '수령' },
]

const columns: ColumnDef<PointTx>[] = [
  {
    key: 'id',
    header: 'ID',
    render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>,
  },
  {
    key: 'createdAt',
    header: '일시',
    render: (r) => (
      <span className="text-xs text-muted-foreground">
        {new Date(r.createdAt).toLocaleString('ko-KR')}
      </span>
    ),
  },
  {
    key: 'fromUserId',
    header: '발신',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {r.fromUserId ? r.fromUserId.slice(0, 8) + '…' : '-'}
      </span>
    ),
  },
  {
    key: 'toUserId',
    header: '수신',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {r.toUserId ? r.toUserId.slice(0, 8) + '…' : '-'}
      </span>
    ),
  },
  {
    key: 'amount',
    header: '금액',
    render: (r) => (
      <span
        className={cn(
          'font-bold tabular-nums',
          r.amount > 0 ? 'text-[var(--ow-blue)]' : 'text-[var(--ow-red)]',
        )}
      >
        {r.amount > 0 ? '+' : ''}
        {r.amount.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'reason',
    header: '사유',
    render: (r) => (
      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded-sm">
        {r.reason}
      </span>
    ),
  },
  {
    key: 'memo',
    header: '메모',
    render: (r) => (
      <span className="text-xs text-muted-foreground max-w-32 truncate block">
        {r.memo ?? '-'}
      </span>
    ),
  },
]

export default function AdminLedgerPage() {
  const [skip, setSkip] = useState(0)
  const [userId, setUserId] = useState('')
  const [reason, setReason] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: summary } = useQuery({
    queryKey: ['admin', 'ledger', 'summary'],
    queryFn: () => ledgerApi.summary(),
  })

  const { data: txList = [], isLoading } = useQuery({
    queryKey: ['admin', 'ledger', 'list', skip, userId, reason, from, to],
    queryFn: () =>
      ledgerApi.list({
        skip,
        take: TAKE,
        ...(userId ? { userId } : {}),
        ...(reason !== 'ALL' ? { reason } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }),
  })

  const handleFilterChange = () => {
    setSkip(0)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black italic uppercase text-foreground">
        포인트 원장
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: '총 발행', value: summary?.minted, color: 'text-[var(--ow-blue)]' },
          { label: '총 소각', value: summary?.burned, color: 'text-[var(--ow-red)]' },
          { label: '유통량', value: summary?.circulating, color: 'text-primary' },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-sm p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
              {card.label}
            </p>
            <p className={cn('text-2xl font-black tabular-nums', card.color)}>
              {card.value != null ? card.value.toLocaleString() : '-'}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-sm p-4 space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase">필터</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="filter-userId" className="text-xs">사용자 ID</Label>
            <Input
              id="filter-userId"
              placeholder="UUID"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                handleFilterChange()
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-reason" className="text-xs">사유</Label>
            <Select
              value={reason}
              onValueChange={(v) => {
                setReason(v)
                handleFilterChange()
              }}
            >
              <SelectTrigger id="filter-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-from" className="text-xs">시작일</Label>
            <Input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                handleFilterChange()
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-to" className="text-xs">종료일</Label>
            <Input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                handleFilterChange()
              }}
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setUserId('')
            setReason('ALL')
            setFrom('')
            setTo('')
            setSkip(0)
          }}
        >
          초기화
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={txList}
        loading={isLoading}
        emptyMessage="거래 내역이 없습니다."
        pagination={{
          skip,
          take: TAKE,
          total: skip + txList.length + (txList.length === TAKE ? 1 : 0),
          onChange: setSkip,
        }}
      />
    </div>
  )
}
