'use client'

import { useState } from 'react'
import { usePointRules } from '../hooks/use-point-rules'
import { useConfirm } from '@/common/components/confirm-dialog'
import { useDialog } from '@/common/hooks/use-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Switch } from '@/common/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/common/components/ui/dialog'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react'
import type { PointRule, PointRuleCategory } from '../types'
import { CATEGORY_LABELS } from '../types'

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

interface RuleFormState {
  code: string
  name: string
  description: string
  category: PointRuleCategory
  points: string
  isActive: boolean
}

const INITIAL_FORM: RuleFormState = {
  code: '',
  name: '',
  description: '',
  category: 'ATTENDANCE',
  points: '100',
  isActive: true,
}

export function PointRulesPanel({ clanId, canManage }: PointRulesPanelProps) {
  const { rules, isLoading, createRule, updateRule, deleteRule, seedDefaults } =
    usePointRules(clanId)
  const confirm = useConfirm()
  const { dialogProps, open: openDialog, close: closeDialog } = useDialog()

  const [editingRule, setEditingRule] = useState<PointRule | null>(null)
  const [form, setForm] = useState<RuleFormState>(INITIAL_FORM)

  const handleOpenCreate = () => {
    setEditingRule(null)
    setForm(INITIAL_FORM)
    openDialog()
  }

  const handleOpenEdit = (rule: PointRule) => {
    setEditingRule(rule)
    setForm({
      code: rule.code,
      name: rule.name,
      description: rule.description || '',
      category: rule.category,
      points: String(rule.points),
      isActive: rule.isActive,
    })
    openDialog()
  }

  const handleSubmit = async () => {
    const points = parseInt(form.points, 10)
    if (isNaN(points)) return
    if (!form.code.trim() || !form.name.trim()) return

    const data = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      points,
      isActive: form.isActive,
    }

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

      {/* Create/Edit Dialog */}
      <Dialog {...dialogProps}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? '규칙 수정' : '규칙 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>코드</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="ATTENDANCE_BASE"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>이름</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="출석 기본 포인트"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="규칙에 대한 설명"
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, category: v as PointRuleCategory }))
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTENDANCE">출석</SelectItem>
                    <SelectItem value="ACTIVITY">활동</SelectItem>
                    <SelectItem value="ACHIEVEMENT">업적</SelectItem>
                    <SelectItem value="PENALTY">페널티</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>포인트</Label>
                <Input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))}
                  placeholder="100"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label>활성화</Label>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={closeDialog}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              className={cn(
                'skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black',
                'hover:bg-primary/90 transition-colors',
              )}
            >
              <span className="skew-x-[10deg]">
                {editingRule ? '수정' : '생성'}
              </span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
