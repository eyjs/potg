'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Gavel, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateAuctionDialog } from './parts/create-auction-dialog'

interface Props {
  canCreate: boolean
}

export function AuctionNoActive({ canCreate }: Props) {
  const [open, setOpen] = useState(false)

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
          <>
            <Button
              onClick={() => setOpen(true)}
              className={cn(
                'skew-x-[-10deg] bg-primary px-6 py-3 text-base font-bold text-black',
                'hover:bg-primary/90 transition-colors',
              )}
            >
              <span className="skew-x-[10deg] flex items-center gap-2">
                <Plus className="w-4 h-4" />새 경매 시작
              </span>
            </Button>
            <CreateAuctionDialog open={open} onOpenChange={setOpen} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
