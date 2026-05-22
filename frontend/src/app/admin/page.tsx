'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ledgerApi, type PointTx } from '@/modules/admin/api/ledger'
import { Skeleton } from '@/common/components/ui/skeleton'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/lib/utils'

const RECENT_TX_TAKE = 10
const CHART_DAYS = 30

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

interface DayBucket {
  date: string
  minted: number
  burned: number
}

function buildChartData(txList: PointTx[]): DayBucket[] {
  const buckets = new Map<string, DayBucket>()

  const now = new Date()
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: formatDate(key), minted: 0, burned: 0 })
  }

  for (const tx of txList) {
    const key = tx.createdAt.slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (tx.amount > 0) {
      bucket.minted += tx.amount
    } else {
      bucket.burned += Math.abs(tx.amount)
    }
  }

  return Array.from(buckets.values())
}

export default function AdminDashboardPage() {
  const router = useRouter()

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'ledger', 'summary'],
    queryFn: () => ledgerApi.summary(),
  })

  const { data: recentTxs = [], isLoading: txLoading } = useQuery({
    queryKey: ['admin', 'ledger', 'recent'],
    queryFn: () =>
      ledgerApi.list({ take: 200, skip: 0 }),
  })

  const chartData = useMemo(() => buildChartData(recentTxs), [recentTxs])
  const latestTxs = useMemo(() => recentTxs.slice(0, RECENT_TX_TAKE), [recentTxs])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black italic uppercase text-foreground">
        대시보드
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-sm" />
          ))
        ) : (
          [
            { label: '총 발행', value: summary?.minted, color: 'text-[var(--ow-blue)]' },
            { label: '총 소각', value: summary?.burned, color: 'text-[var(--ow-red)]' },
            { label: '유통량', value: summary?.circulating, color: 'text-primary' },
          ].map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-sm p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                {card.label}
              </p>
              <p className={cn('text-3xl font-black tabular-nums', card.color)}>
                {card.value != null ? card.value.toLocaleString() : '-'}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-muted-foreground uppercase">
          최근 {CHART_DAYS}일 발행/소각 추이
        </h2>
        {txLoading ? (
          <Skeleton className="h-48 w-full rounded-sm" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--ow-blue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--ow-blue)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--ow-red)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--ow-red)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="minted"
                name="발행"
                stroke="var(--ow-blue)"
                strokeWidth={2}
                fill="url(#mintGradient)"
              />
              <Area
                type="monotone"
                dataKey="burned"
                name="소각"
                stroke="var(--ow-red)"
                strokeWidth={2}
                fill="url(#burnGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-muted-foreground uppercase">최근 거래 내역</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/ledger')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            전체 보기 →
          </Button>
        </div>
        {txLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-sm" />
            ))}
          </div>
        ) : latestTxs.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            거래 내역이 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20">
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">일시</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">사유</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">금액</th>
              </tr>
            </thead>
            <tbody>
              {latestTxs.map((tx) => (
                <tr key={tx.id} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded-sm">
                      {tx.reason}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={cn(
                        'font-bold tabular-nums text-sm',
                        tx.amount > 0 ? 'text-[var(--ow-blue)]' : 'text-[var(--ow-red)]',
                      )}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
