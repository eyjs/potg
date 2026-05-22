'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { membersApi, type AdminMember } from '@/modules/admin/api/members'
import { memberAdjustSchema, type MemberAdjustFormValues } from '@/modules/admin/schemas/member-adjust.schema'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { cn } from '@/lib/utils'

const TAKE = 50

const ROLE_LABEL: Record<string, string> = {
  USER: '일반',
  CAPTAIN: '캡틴',
  ADMIN: '관리자',
}

const ROLE_CLASS: Record<string, string> = {
  USER: 'text-muted-foreground',
  CAPTAIN: 'text-[var(--ow-blue)]',
  ADMIN: 'text-primary font-bold',
}

const columns: ColumnDef<AdminMember>[] = [
  { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
  { key: 'username', header: '닉네임', render: (r) => <span className="font-medium">{r.username}</span> },
  { key: 'battleTag', header: '배틀태그' },
  {
    key: 'role',
    header: '권한',
    render: (r) => (
      <span className={cn('text-sm font-semibold', ROLE_CLASS[r.role])}>
        {ROLE_LABEL[r.role] ?? r.role}
      </span>
    ),
  },
  {
    key: 'totalPoints',
    header: '잔액',
    render: (r) => (
      <span className="tabular-nums text-primary font-bold">
        {r.totalPoints.toLocaleString()}P
      </span>
    ),
  },
  {
    key: 'lockedPoints',
    header: '잠금',
    render: (r) => (
      <span className="tabular-nums text-muted-foreground text-xs">
        {r.lockedPoints.toLocaleString()}P
      </span>
    ),
  },
  {
    key: 'marketGatePassed',
    header: '마켓권한',
    render: (r) => (
      <span className={r.marketGatePassed ? 'text-[var(--ow-blue)]' : 'text-muted-foreground'}>
        {r.marketGatePassed ? '✓' : '✗'}
      </span>
    ),
  },
]

export default function AdminMembersPage() {
  const queryClient = useQueryClient()
  const [skip, setSkip] = useState(0)
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null)
  const [dialogMode, setDialogMode] = useState<'role' | 'adjust'>('role')
  const [open, setOpen] = useState(false)
  const [pendingRole, setPendingRole] = useState<'USER' | 'CAPTAIN' | 'ADMIN'>('USER')
  const [roleLoading, setRoleLoading] = useState(false)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin', 'members', skip],
    queryFn: () => membersApi.list({ skip, take: TAKE }),
  })

  const form = useForm<MemberAdjustFormValues>({
    resolver: zodResolver(memberAdjustSchema),
    defaultValues: { delta: 0, memo: '' },
  })

  const openDialog = (member: AdminMember, mode: 'role' | 'adjust') => {
    setSelectedMember(member)
    setDialogMode(mode)
    setPendingRole(member.role as 'USER' | 'CAPTAIN' | 'ADMIN')
    form.reset({ delta: 0, memo: '' })
    setOpen(true)
  }

  const handleRoleSave = async () => {
    if (!selectedMember) return
    setRoleLoading(true)
    try {
      await membersApi.updateRole(selectedMember.id, pendingRole)
      toast.success('권한이 변경되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      setOpen(false)
    } catch {
      toast.error('권한 변경에 실패했습니다.')
    } finally {
      setRoleLoading(false)
    }
  }

  const handleAdjust = form.handleSubmit(async (values) => {
    if (!selectedMember) return
    try {
      await membersApi.adjustPoints(selectedMember.id, values)
      toast.success('잔액이 조정되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      setOpen(false)
    } catch {
      toast.error('잔액 조정에 실패했습니다.')
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic uppercase text-foreground">
          회원 관리
        </h1>
        <span className="text-sm text-muted-foreground">
          {skip + 1}–{skip + members.length}
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={members}
        loading={isLoading}
        emptyMessage="회원이 없습니다."
        pagination={{
          skip,
          take: TAKE,
          total: skip + members.length + (members.length === TAKE ? 1 : 0),
          onChange: setSkip,
        }}
        onRowClick={(row) => {
          openDialog(row, 'role')
        }}
      />

      {/* Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedMember?.username} — {dialogMode === 'role' ? '권한 변경' : '잔액 조정'}
            </DialogTitle>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="flex gap-2 border-b border-border pb-3">
            <button
              onClick={() => setDialogMode('role')}
              className={cn(
                'px-3 py-1 text-sm font-semibold rounded-sm transition-colors',
                dialogMode === 'role'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              권한
            </button>
            <button
              onClick={() => setDialogMode('adjust')}
              className={cn(
                'px-3 py-1 text-sm font-semibold rounded-sm transition-colors',
                dialogMode === 'adjust'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              잔액 조정
            </button>
          </div>

          {dialogMode === 'role' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-select">권한</Label>
                <Select
                  value={pendingRole}
                  onValueChange={(v) => setPendingRole(v as 'USER' | 'CAPTAIN' | 'ADMIN')}
                >
                  <SelectTrigger id="role-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">일반</SelectItem>
                    <SelectItem value="CAPTAIN">캡틴</SelectItem>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button onClick={handleRoleSave} disabled={roleLoading}>
                  {roleLoading ? '저장 중...' : '저장'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delta">조정 금액 (양수: 지급, 음수: 차감)</Label>
                <Input
                  id="delta"
                  type="number"
                  {...form.register('delta', { valueAsNumber: true })}
                  placeholder="예: 1000 또는 -500"
                  aria-invalid={!!form.formState.errors.delta}
                />
                {form.formState.errors.delta && (
                  <p className="text-destructive text-xs">{form.formState.errors.delta.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">사유</Label>
                <Input
                  id="memo"
                  {...form.register('memo')}
                  placeholder="조정 사유를 입력하세요"
                  aria-invalid={!!form.formState.errors.memo}
                />
                {form.formState.errors.memo && (
                  <p className="text-destructive text-xs">{form.formState.errors.memo.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} type="button">취소</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? '처리 중...' : '적용'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
