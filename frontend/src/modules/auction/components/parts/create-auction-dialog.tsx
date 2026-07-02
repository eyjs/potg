'use client'

import { useForm, Controller } from 'react-hook-form'
import { Crown, ClipboardList } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { cn } from '@/lib/utils'
import { handleApiError } from '@/lib/api-error'
import { auctionsApi } from '../../api/auctions'
import {
  AUCTION_CREATE_DEFAULTS,
  auctionCreateSchema,
  type AuctionCreateFormValues,
} from '../../schemas/auction-create.schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 새 경매 생성 Dialog.
 *
 * - AuctionNoActive 와 AuctionCompleted 모두 같은 흐름을 사용.
 * - 생성 후 react-query 의 ['auction', 'current'] 를 invalidate 하여
 *   useCurrentAuction 이 새 PENDING 을 자동 추적하게 함 (active 가 COMPLETED 보다
 *   우선 노출 → orchestrator 가 자동으로 PENDING 화면으로 전환).
 */
export function CreateAuctionDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const form = useForm<AuctionCreateFormValues>({
    resolver: zodResolver(auctionCreateSchema),
    defaultValues: AUCTION_CREATE_DEFAULTS,
  })
  const errors = form.formState.errors

  const onSubmit = async (values: AuctionCreateFormValues) => {
    try {
      await auctionsApi.create(values)
      toast.success('경매방이 생성되었습니다.')
      form.reset(AUCTION_CREATE_DEFAULTS)
      onOpenChange(false)
      await queryClient.invalidateQueries({ queryKey: ['auction', 'current'] })
    } catch (error) {
      handleApiError(error, '경매방 생성 실패')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>새 경매 생성</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label>제목</Label>
            <Input
              {...form.register('title')}
              placeholder="2026 시즌 1차 드래프트"
              className="bg-background"
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>

          {/* 로스터 모드 — 시스템 정원(팀당 확보 선수 수)을 결정 */}
          <div className="space-y-2">
            <Label>로스터 모드</Label>
            <Controller
              control={form.control}
              name="rosterMode"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: 'CAPTAIN' as const,
                        icon: Crown,
                        title: '팀장 모드',
                        desc: '팀장 포함 5명 · 선수 4명',
                      },
                      {
                        value: 'COACH' as const,
                        icon: ClipboardList,
                        title: '감독 모드',
                        desc: '감독 별도 · 선수 5명',
                      },
                    ]
                  ).map(({ value, icon: Icon, title, desc }) => {
                    const active = field.value === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        aria-pressed={active}
                        className={cn(
                          'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
                          active
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                            : 'border-border bg-background hover:bg-primary/5',
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-bold">
                          <Icon
                            className={cn(
                              'w-4 h-4',
                              active ? 'text-primary' : 'text-muted-foreground',
                            )}
                          />
                          {title}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>팀 수 (2~8)</Label>
              <Input
                type="number"
                {...form.register('teamCount', { valueAsNumber: true })}
                className="bg-background"
              />
              {errors.teamCount && (
                <p className="text-destructive text-xs">
                  {errors.teamCount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>시작 포인트</Label>
              <Input
                type="number"
                {...form.register('startingPoints', { valueAsNumber: true })}
                className="bg-background"
              />
              {errors.startingPoints && (
                <p className="text-destructive text-xs">
                  {errors.startingPoints.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>턴 시간(초)</Label>
              <Input
                type="number"
                {...form.register('turnTimeLimit', { valueAsNumber: true })}
                className="bg-background"
              />
              {errors.turnTimeLimit && (
                <p className="text-destructive text-xs">
                  {errors.turnTimeLimit.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className={cn(
                'skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black',
                'hover:bg-primary/90 transition-colors',
              )}
            >
              <span className="skew-x-[10deg]">생성</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
