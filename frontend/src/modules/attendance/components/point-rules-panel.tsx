'use client'

import { useState } from 'react'
import { usePointRules } from '../hooks/use-point-rules'
import { useConfirm } from '@/common/components/confirm-dialog'
import { useDialog } from '@/common/hooks/use-dialog'
import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Switch } from '@/common/components/ui/switch'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react'
import type { PointRule, PointRuleCategory } from '../types'
import { CATEGORY_LABELS } from '../types'
import { PointRuleFormDialog } from './point-rule-form-dialog'

interface PointRulesPanelProps {
  clanId: string | undefined
  canManage: boolean
}

const CATEGORY_BADGE_COLORS: Record<PointRuleCategory, string> = {
  ATTENDANCE: 'bg-green-500/20 text-green-400 border-green-500/30',
  ACTIVITY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ACHIEVEMENT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PENALTY: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function PointRulesPanel({ clanId, canManage }: PointRulesPanelProps) {
  const { rules, isLoading, createRule, updateRule, deleteRule, seedDefaults } =
    usePointRules(clanId)
  const confirm = useConfirm()
  const { dialogProps, open: openDialog, close: closeDialog } = useDialog()

  const [editingRule, setEditingRule] = useState<PointRule | null>(null)

  const handleOpenCreate = () => {
    setEditingRule(null)
    openDialog()
  }

  const handleOpenEdit = (rule: PointRule) => {
    setEditingRule(rule)
    openDialog()
  }

  const handleSubmit = async (data: {
    code: string
    name: string
    description?: string
    category: PointRuleCategory
    points: number
    isActive: boolean
  }) => {
    if (editingRule) {
      await updateRule(editingRule.id, data)
    } else {
      await createRule(data)
    }
    closeDialog()
  }

  const handleDelete = async (rule: PointRule) => {
    const ok = await confirm({
      title: `"${rule.name}" 규칙을 삭제하시겠습니까?`,
      variant: 'destructive',
      confirmText: '삭제',
    })
    if (ok) await deleteRule(rule.id)
  }

  const handleToggleActive = async (rule: PointRule) => {
    await updateRule(rule.id, { isActive: !rule.isActive })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex gap-2">
          <button
            onClick={handleOpenCreate}
            className={cn(
              'skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black',
              'hover:bg-primary/90 transition-colors',
            )}
          >
            <span className="skew-x-[10deg] flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              규칙 추가
            </span>
          </button>
          {rules.length === 0 && (
            <button
              onClick={seedDefaults}
              className={cn(
                'skew-x-[-10deg] bg-ow-blue/20 border border-ow-blue/30 px-4 py-2 text-sm font-bold text-ow-blue',
                'hover:bg-ow-blue/30 transition-colors',
              )}
            >
              <span className="skew-x-[10deg] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                기본 규칙 생성
              </span>
            </button>
          )}
        </div>
      )}

      {rules.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            등록된 포인트 규칙이 없습니다.
            {canManage && ' 기본 규칙을 생성하거나 직접 추가해주세요.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={cn(
                'bg-card border-border transition-opacity',
                !rule.isActive && 'opacity-50',
              )}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-xs',
                        CATEGORY_BADGE_COLORS[rule.category],
                      )}
                    >
                      {CATEGORY_LABELS[rule.category]}
                    </Badge>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{rule.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {rule.code}
                        </span>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {rule.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={cn(
                        'font-bold text-lg tabular-nums',
                        rule.points > 0 ? 'text-primary' : 'text-ow-red',
                      )}
                    >
                      {rule.points > 0 ? '+' : ''}
                      {rule.points}P
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1.5 text-muted-foreground hover:text-white transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule)}
                          className="p-1.5 text-muted-foreground hover:text-ow-red transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PointRuleFormDialog
        dialogProps={dialogProps}
        editingRule={editingRule}
        onSubmit={handleSubmit}
        onClose={closeDialog}
      />
    </div>
  )
}
