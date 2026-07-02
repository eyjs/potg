'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { cn } from '@/lib/utils'
import { useHeroes } from '../../hooks/use-heroes'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 현재 설정된 영웅 key (없으면 null) */
  currentHero: string | null
  /** 대상 매물 표시명 (다이얼로그 제목용) */
  targetName: string
  onSelect: (heroKey: string | null) => void
}

const ROLE_LABEL: Record<string, string> = {
  tank: '돌격',
  damage: '공격',
  support: '지원',
}

/** 대표 영웅 선택 — OverFast 영웅 초상화 그리드. */
export function HeroPickerDialog({
  open,
  onOpenChange,
  currentHero,
  targetName,
  onSelect,
}: Props) {
  const { heroes, isLoading, isError } = useHeroes()
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = q
    ? heroes.filter(
        (h) => h.name.toLowerCase().includes(q) || h.key.includes(q),
      )
    : heroes

  const handlePick = (key: string | null) => {
    onSelect(key)
    onOpenChange(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            대표 영웅 — <span className="text-primary">{targetName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="영웅 검색..."
            className="h-8 text-sm bg-background"
          />
          {currentHero && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePick(null)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              해제
            </Button>
          )}
        </div>

        {isLoading && (
          <p className="text-xs text-muted-foreground text-center py-8">
            영웅 목록 불러오는 중...
          </p>
        )}
        {isError && (
          <p className="text-xs text-destructive text-center py-8">
            영웅 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.
          </p>
        )}

        {!isLoading && !isError && (
          <ul className="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
            {filtered.map((h) => (
              <li key={h.key}>
                <button
                  type="button"
                  onClick={() => handlePick(h.key)}
                  className={cn(
                    'w-full flex flex-col items-center gap-1 rounded-sm p-1.5 transition-colors',
                    'hover:bg-primary/10',
                    currentHero === h.key
                      ? 'bg-primary/15 ring-1 ring-primary'
                      : 'bg-muted/20',
                  )}
                >
                  <Image
                    src={h.portrait}
                    alt={h.name}
                    width={48}
                    height={48}
                    unoptimized
                    className="rounded-sm"
                  />
                  <span className="text-[10px] leading-tight truncate w-full text-center">
                    {h.name}
                  </span>
                  <span className="text-[8px] uppercase text-muted-foreground">
                    {ROLE_LABEL[h.role] ?? h.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
