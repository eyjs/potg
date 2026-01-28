'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, POSITION_LABELS } from '../types'
import type { ClanMember, GroupedMembers } from '../types'

interface ClanChartsProps {
  members: ClanMember[]
  groupedMembers: GroupedMembers
}

const ROLE_CHART_DATA_KEYS = [
  { key: 'MASTER', label: '마스터', color: CHART_COLORS.master },
  { key: 'MANAGER', label: '운영진', color: CHART_COLORS.manager },
  { key: 'MEMBER', label: '멤버', color: CHART_COLORS.member },
] as const

const POSITION_COLORS: Record<string, string> = {
  TANK: CHART_COLORS.tank,
  DPS: CHART_COLORS.dps,
  SUPPORT: CHART_COLORS.support,
  FLEX: CHART_COLORS.flex,
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>
}) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-foreground">{data.name}</p>
      <p className="text-xs text-muted-foreground">{data.value}명</p>
    </div>
  )
}

export function ClanCharts({ members, groupedMembers }: ClanChartsProps) {
  const roleData = useMemo(
    () =>
      ROLE_CHART_DATA_KEYS.map((r) => ({
        name: r.label,
        value: groupedMembers[r.key].length,
        fill: r.color,
      })).filter((d) => d.value > 0),
    [groupedMembers],
  )

  const positionData = useMemo(() => {
    const counts: Record<string, number> = {}
    members.forEach((m) => {
      const role = m.user?.mainRole || 'FLEX'
      counts[role] = (counts[role] || 0) + 1
    })
    return Object.entries(counts)
      .map(([key, value]) => ({
        name: POSITION_LABELS[key] || key,
        value,
        fill: POSITION_COLORS[key] || CHART_COLORS.flex,
      }))
      .sort((a, b) => b.value - a.value)
  }, [members])

  if (members.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 역할 분포 */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">역할 분포</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                >
                  {roleData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* 범례 */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {roleData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 포지션 분포 */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">포지션 분포</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={positionData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={50}
                tick={{ fill: '#a0a0a0', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {positionData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* 범례 */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {positionData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
