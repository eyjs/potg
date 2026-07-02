'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { membersApi, type AdminMember } from '@/modules/admin/api/members'
import { memberAdjustSchema, type MemberAdjustFormValues } from '@/modules/admin/schemas/member-adjust.schema'
import { makeMemberFormSchema, type MemberFormValues } from '@/modules/admin/schemas/member-form.schema'
import { useAuth } from '@/context/auth-context'
import { useConfirm } from '@/common/components/confirm-dialog'
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
import { HeroPickerDialog } from '@/modules/auction/components/parts/hero-picker-dialog'
import { useHeroes } from '@/modules/auction/hooks/use-heroes'

export interface MemberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null이면 추가 모드, non-null이면 수정 모드. */
  member: AdminMember | null
}

export function MemberFormDialog({ open, onOpenChange, member }: MemberFormDialogProps) {
  const isEdit = !!member
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-md overflow-y-auto max-h-[90vh]">
        {/* key로 모드 전환 시 폼 재마운트 → resolver(isEdit) 갱신 보장 */}
        <MemberFormInner
          key={isEdit ? `edit-${member.id}` : 'create'}
          member={member}
          isEdit={isEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

interface MemberFormInnerProps {
  member: AdminMember | null
  isEdit: boolean
  onClose: () => void
}

function MemberFormInner({ member, isEdit, onClose }: MemberFormInnerProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const [adjustDelta, setAdjustDelta] = useState(0)

  // 대표 영웅 (react-hook-form 외부 상태 — HeroPickerDialog로 선택)
  const { heroes, portraitByKey } = useHeroes()
  const [heroKey, setHeroKey] = useState<string | null>(
    member?.representativeHero ?? null,
  )
  const [heroPickerOpen, setHeroPickerOpen] = useState(false)
  const heroName = heroKey
    ? (heroes.find((h) => h.key === heroKey)?.name ?? heroKey)
    : null
  const heroPortrait = heroKey ? portraitByKey.get(heroKey) : undefined

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })

  // 메인 폼: 추가/수정 공통 필드
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(makeMemberFormSchema(isEdit)),
    defaultValues: isEdit
      ? {
          username: member!.username,
          nickname: member!.nickname ?? '',
          role: member!.role === 'ADMIN' ? 'ADMIN' : 'USER',
          password: '',
        }
      : {
          username: '',
          nickname: '',
          role: 'USER',
          password: '',
        },
  })

  // 잔액 조정 폼 (수정 모드 전용, 메인 폼 submit과 분리)
  const adjustForm = useForm<MemberAdjustFormValues>({
    resolver: zodResolver(memberAdjustSchema),
    defaultValues: { delta: 0, memo: '' },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    setBusy(true)
    try {
      if (isEdit) {
        // 변경된 필드만 DTO에 포함
        const dto: {
          username?: string
          nickname?: string
          role?: 'USER' | 'CAPTAIN' | 'ADMIN'
          password?: string
          representativeHero?: string
        } = {}
        if (values.username !== member!.username) dto.username = values.username
        const oldNickname = member!.nickname ?? ''
        const newNickname = values.nickname ?? ''
        // 빈 문자열도 전송하여 닉네임 해제(null 처리)를 백엔드에 반영한다.
        if (newNickname !== oldNickname) dto.nickname = newNickname
        const displayRole = member!.role === 'ADMIN' ? 'ADMIN' : 'USER'
        if (values.role !== displayRole) dto.role = values.role
        // 빈 password는 payload에서 제외
        if (values.password) dto.password = values.password
        // 대표 영웅 변경 시 반영 (해제는 빈 문자열 → 백엔드에서 null 처리)
        const oldHero = member!.representativeHero ?? null
        if (heroKey !== oldHero) dto.representativeHero = heroKey ?? ''
        await membersApi.update(member!.id, dto)
        toast.success('회원 정보가 수정되었습니다.')
      } else {
        await membersApi.create({
          username: values.username,
          password: values.password,
          role: values.role,
          nickname: values.nickname || undefined,
        })
        toast.success('회원이 생성되었습니다.')
      }
      invalidate()
      onClose()
    } catch (e) {
      toast.error(errMsg(e, isEdit ? '수정에 실패했습니다.' : '생성에 실패했습니다.'))
    } finally {
      setBusy(false)
    }
  })

  const handleAdjust = adjustForm.handleSubmit(async (values) => {
    if (!member) return
    try {
      await membersApi.adjustPoints(member.id, values)
      toast.success('잔액이 조정되었습니다.')
      adjustForm.reset({ delta: 0, memo: '' })
      setAdjustDelta(0)
      invalidate()
    } catch (e) {
      toast.error(errMsg(e, '잔액 조정에 실패했습니다.'))
    }
  })

  const handleDelete = async () => {
    if (!member) return
    const ok = await confirm({
      title: `${member.username} 회원을 삭제하시겠습니까?`,
      description: '이 작업은 되돌릴 수 없습니다.',
      confirmText: '삭제',
      variant: 'destructive',
    })
    if (!ok) return
    setBusy(true)
    try {
      await membersApi.remove(member.id)
      toast.success('삭제되었습니다.')
      invalidate()
      onClose()
    } catch (e) {
      toast.error(errMsg(e, '삭제에 실패했습니다.'))
    } finally {
      setBusy(false)
    }
  }

  const isSelf = user?.id === member?.id

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">
          {isEdit ? `${member!.username} — 회원 편집` : '회원 추가'}
        </DialogTitle>
      </DialogHeader>

      {/* 공통 필드 폼 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 아이디 */}
        <div className="space-y-2">
          <Label htmlFor="mf-username">아이디</Label>
          <Input
            id="mf-username"
            {...form.register('username')}
            placeholder="로그인 아이디"
            aria-invalid={!!form.formState.errors.username}
          />
          {form.formState.errors.username && (
            <p className="text-destructive text-xs">{form.formState.errors.username.message}</p>
          )}
        </div>

        {/* 닉네임 */}
        <div className="space-y-2">
          <Label htmlFor="mf-nickname">닉네임</Label>
          <Input
            id="mf-nickname"
            {...form.register('nickname')}
            placeholder="닉네임 (선택)"
          />
        </div>

        {/* 대표 영웅 (수정 모드 전용) */}
        {isEdit && (
          <div className="space-y-2">
            <Label>대표 영웅</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHeroPickerOpen(true)}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-md border border-border bg-background p-2',
                  'hover:bg-primary/5 transition-colors',
                )}
              >
                {heroPortrait ? (
                  <Image
                    src={heroPortrait}
                    alt={heroName ?? ''}
                    width={40}
                    height={40}
                    unoptimized
                    className="rounded-sm shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground">
                    없음
                  </div>
                )}
                <span className="text-sm">
                  {heroName ?? '대표 영웅 선택'}
                </span>
              </button>
              {heroKey && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setHeroKey(null)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  해제
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 권한 */}
        <div className="space-y-2">
          <Label>권한</Label>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">일반</SelectItem>
                  <SelectItem value="ADMIN">관리자</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.role && (
            <p className="text-destructive text-xs">{form.formState.errors.role.message}</p>
          )}
        </div>

        {/* 비밀번호 */}
        <div className="space-y-2">
          <Label htmlFor="mf-password">
            {isEdit ? '비밀번호 (빈 값이면 변경 안 함)' : '비밀번호 (필수, 4자 이상)'}
          </Label>
          <Input
            id="mf-password"
            type="text"
            {...form.register('password')}
            placeholder={isEdit ? '변경하려면 입력하세요' : '4자 이상'}
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.password}
          />
          {form.formState.errors.password && (
            <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={busy}>
            {busy
              ? isEdit ? '저장 중...' : '생성 중...'
              : isEdit ? '저장' : '생성'}
          </Button>
        </DialogFooter>
      </form>

      {/* 수정 모드 전용: 잔액 조정 */}
      {isEdit && (
        <>
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold">잔액 조정</h3>
            <p className="text-xs text-muted-foreground">
              현재 잔액:{' '}
              <span className="text-primary font-bold tabular-nums">
                {(member!.totalPoints ?? 0).toLocaleString()}P
              </span>
              {adjustDelta !== 0 && (
                <span className="ml-2">
                  {'→ 조정 후: '}
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      adjustDelta > 0 ? 'text-[var(--ow-blue)]' : 'text-[var(--ow-red)]',
                    )}
                  >
                    {((member!.totalPoints ?? 0) + adjustDelta).toLocaleString()}P
                  </span>
                </span>
              )}
            </p>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="adj-delta">조정 금액 (양수: 지급, 음수: 차감)</Label>
                <Input
                  id="adj-delta"
                  type="number"
                  {...adjustForm.register('delta', {
                    valueAsNumber: true,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdjustDelta(Number(e.target.value) || 0),
                  })}
                  placeholder="예: 1000 또는 -500"
                  aria-invalid={!!adjustForm.formState.errors.delta}
                />
                {adjustForm.formState.errors.delta && (
                  <p className="text-destructive text-xs">
                    {adjustForm.formState.errors.delta.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adj-memo">사유</Label>
                <Input
                  id="adj-memo"
                  {...adjustForm.register('memo')}
                  placeholder="조정 사유를 입력하세요"
                />
                {adjustForm.formState.errors.memo && (
                  <p className="text-destructive text-xs">
                    {adjustForm.formState.errors.memo.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={adjustForm.formState.isSubmitting}
              >
                {adjustForm.formState.isSubmitting ? '처리 중...' : '적용'}
              </Button>
            </form>
          </div>

          {/* 위험 구역: 삭제 */}
          <div className="border-t border-border pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-destructive">위험 구역</h3>
            {isSelf && (
              <p className="text-xs text-muted-foreground">본인 계정은 삭제할 수 없습니다.</p>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={busy || isSelf}
            >
              {busy ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </>
      )}

      <HeroPickerDialog
        open={heroPickerOpen}
        onOpenChange={setHeroPickerOpen}
        currentHero={heroKey}
        targetName={member?.username ?? ''}
        onSelect={setHeroKey}
      />
    </>
  )
}

/** axios 에러에서 백엔드 메시지 추출. */
function errMsg(e: unknown, fallback: string): string {
  const anyE = e as { response?: { data?: { message?: string | string[] } } }
  const m = anyE?.response?.data?.message
  if (Array.isArray(m)) return m[0] ?? fallback
  return m ?? fallback
}
