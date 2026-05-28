'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/common/components/ui/dialog'
import { Gavel, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { handleApiError } from '@/lib/api-error'
import { auctionsApi } from '../api/auctions'
import {
  AUCTION_CREATE_DEFAULTS,
  auctionCreateSchema,
  type AuctionCreateFormValues,
} from '../schemas/auction-create.schema'

interface Props {
  canCreate: boolean
}

export function AuctionNoActive({ canCreate }: Props) {
  const [open, setOpen] = useState(false)
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
      setOpen(false)
      form.reset(AUCTION_CREATE_DEFAULTS)
      await queryClient.invalidateQueries({ queryKey: ['auction', 'current'] })
    } catch (error) {
      handleApiError(error, '경매방 생성 실패')
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="py-20 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-md flex items-center justify-center">
          <Gavel className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">
            진행 중인 <span className="text-primary">경매</span>가 없습니다
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            {canCreate
              ? '아래 버튼을 눌러 새 경매를 시작하세요.'
              : '운영진이 경매를 시작할 때까지 기다려주세요.'}
          </p>
        </div>

        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className={cn(
                  'skew-x-[-10deg] bg-primary px-6 py-3 text-base font-bold text-black',
                  'hover:bg-primary/90 transition-colors',
                )}
              >
                <span className="skew-x-[10deg] flex items-center gap-2">
                  <Plus className="w-4 h-4" />새 경매 시작
                </span>
              </Button>
            </DialogTrigger>
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
                    onClick={() => setOpen(false)}
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
        )}
      </CardContent>
    </Card>
  )
}
