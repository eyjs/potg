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

type DetailMode = 'role' | 'adjust' | 'username' | 'password' | 'delete'

const DETAIL_TABS: { key: DetailMode; label: string }[] = [
  { key: 'role', label: '권한' },
  { key: 'adjust', label: '잔액' },
  { key: 'username', label: '아이디' },
  { key: 'password', label: '비밀번호' },
  { key: 'delete', label: '삭제' },
]

const columns: ColumnDef<AdminMember>[] = [
  { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
  { key: 'username', header: '아이디', render: (r) => <span className="font-medium">{r.username}</span> },
  { key: 'battleTag', header: '배틀태그', render: (r) => <span>{r.battleTag ?? '-'}</span> },
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
        {(r.totalPoints ?? 0).toLocaleString()}P
      </span>
    ),
  },
]

export default function AdminMembersPage() {
  const queryClient = useQueryClient()
  const [skip, setSkip] = useState(0)
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null)
  const [dialogMode, setDialogMode] = useState<DetailMode>('role')
  const [open, setOpen] = useState(false)
  const [pendingRole, setPendingRole] = useState<'USER' | 'ADMIN'>('USER')
  const [busy, setBusy] = useState(false)

  // 아이디/비번 변경 입력
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')

  // 회원 추가 다이얼로그
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    nickname: '',
    role: 'USER' as 'USER' | 'ADMIN',
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin', 'members', skip],
    queryFn: () => membersApi.list({ skip, take: TAKE }),
  })

  const form = useForm<MemberAdjustFormValues>({
    resolver: zodResolver(memberAdjustSchema),
    defaultValues: { delta: 0, memo: '' },
  })

  const openDialog = (member: AdminMember, mode: DetailMode = 'role') => {
    setSelectedMember(member)
    setDialogMode(mode)
    setPendingRole(member.role === 'ADMIN' ? 'ADMIN' : 'USER')
    setUsernameInput(member.username)
    setPasswordInput('')
    form.reset({ delta: 0, memo: '' })
    setOpen(true)
  }

  const handleRoleSave = async () => {
    if (!selectedMember) return
    setBusy(true)
    try {
      await membersApi.updateRole(selectedMember.id, pendingRole)
      toast.success('권한이 변경되었습니다.')
      invalidate()
      setOpen(false)
    } catch {
      toast.error('권한 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const handleAdjust = form.handleSubmit(async (values) => {
    if (!selectedMember) return
    try {
      await membersApi.adjustPoints(selectedMember.id, values)
      toast.success('잔액이 조정되었습니다.')
      invalidate()
      setOpen(false)
    } catch {
      toast.error('잔액 조정에 실패했습니다.')
    }
  })

  const handleUsernameSave = async () => {
    if (!selectedMember) return
    const next = usernameInput.trim()
    if (!next) {
      toast.error('아이디를 입력하세요.')
      return
    }
    setBusy(true)
    try {
      await membersApi.updateUsername(selectedMember.id, next)
      toast.success('아이디가 변경되었습니다.')
      invalidate()
      setOpen(false)
    } catch (e) {
      toast.error(errMsg(e, '아이디 변경에 실패했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!selectedMember) return
    if (passwordInput.length < 4) {
      toast.error('비밀번호는 4자 이상이어야 합니다.')
      return
    }
    setBusy(true)
    try {
      await membersApi.updatePassword(selectedMember.id, passwordInput)
      toast.success('비밀번호가 변경되었습니다.')
      setOpen(false)
    } catch (e) {
      toast.error(errMsg(e, '비밀번호 변경에 실패했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMember) return
    setBusy(true)
    try {
      await membersApi.remove(selectedMember.id)
      toast.success('삭제되었습니다.')
      invalidate()
      setOpen(false)
    } catch (e) {
      toast.error(errMsg(e, '삭제에 실패했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.username.trim()) {
      toast.error('아이디를 입력하세요.')
      return
    }
    if (createForm.password.length < 4) {
      toast.error('비밀번호는 4자 이상이어야 합니다.')
      return
    }
    setBusy(true)
    try {
      await membersApi.create({
        username: createForm.username.trim(),
        password: createForm.password,
        role: createForm.role,
        nickname: createForm.nickname.trim() || undefined,
      })
      toast.success('회원이 생성되었습니다.')
      invalidate()
      setCreateOpen(false)
      setCreateForm({ username: '', password: '', nickname: '', role: 'USER' })
    } catch (e) {
      toast.error(errMsg(e, '회원 생성에 실패했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic uppercase text-foreground">
          회원 관리
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {members.length > 0 ? `${skip + 1}–${skip + members.length}` : '0'}
          </span>
          <Button onClick={() => setCreateOpen(true)}>+ 회원 추가</Button>
        </div>
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
        onRowClick={(row) => openDialog(row, 'role')}
      />

      {/* 상세/편집 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedMember?.username} — 회원 편집
            </DialogTitle>
          </DialogHeader>

          {/* 탭 */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            {DETAIL_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setDialogMode(t.key)}
                className={cn(
                  'px-3 py-1 text-sm font-semibold rounded-sm transition-colors',
                  dialogMode === t.key
                    ? t.key === 'delete'
                      ? 'bg-destructive text-white'
                      : 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {dialogMode === 'role' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-select">권한</Label>
                <Select value={pendingRole} onValueChange={(v) => setPendingRole(v as 'USER' | 'ADMIN')}>
                  <SelectTrigger id="role-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">일반</SelectItem>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button onClick={handleRoleSave} disabled={busy}>{busy ? '저장 중...' : '저장'}</Button>
              </DialogFooter>
            </div>
          )}

          {dialogMode === 'adjust' && (
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
                <Input id="memo" {...form.register('memo')} placeholder="조정 사유를 입력하세요" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} type="button">취소</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? '처리 중...' : '적용'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {dialogMode === 'username' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username-input">로그인 아이디</Label>
                <Input
                  id="username-input"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="새 아이디"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button onClick={handleUsernameSave} disabled={busy}>{busy ? '저장 중...' : '변경'}</Button>
              </DialogFooter>
            </div>
          )}

          {dialogMode === 'password' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password-input">새 비밀번호 (4자 이상)</Label>
                <Input
                  id="password-input"
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="새 비밀번호"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">현재 비밀번호 확인 없이 재설정됩니다.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button onClick={handlePasswordSave} disabled={busy}>{busy ? '저장 중...' : '변경'}</Button>
              </DialogFooter>
            </div>
          )}

          {dialogMode === 'delete' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                <span className="font-bold text-destructive">{selectedMember?.username}</span> 회원을
                삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={busy}>
                  {busy ? '삭제 중...' : '삭제'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 회원 추가 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">회원 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-username">로그인 아이디 *</Label>
              <Input
                id="c-username"
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="아이디"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-password">비밀번호 * (4자 이상)</Label>
              <Input
                id="c-password"
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="비밀번호"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-nickname">닉네임</Label>
              <Input
                id="c-nickname"
                value={createForm.nickname}
                onChange={(e) => setCreateForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder="닉네임 (선택)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-role">권한</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as 'USER' | 'ADMIN' }))}
              >
                <SelectTrigger id="c-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">일반</SelectItem>
                  <SelectItem value="ADMIN">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
              <Button onClick={handleCreate} disabled={busy}>{busy ? '생성 중...' : '생성'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** axios 에러에서 백엔드 메시지 추출. */
function errMsg(e: unknown, fallback: string): string {
  const anyE = e as { response?: { data?: { message?: string | string[] } } }
  const m = anyE?.response?.data?.message
  if (Array.isArray(m)) return m[0] ?? fallback
  return m ?? fallback
}
