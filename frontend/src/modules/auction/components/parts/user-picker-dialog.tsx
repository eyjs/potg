'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Checkbox } from '@/common/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { Skeleton } from '@/common/components/ui/skeleton'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usersApi } from '../../api/auctions'

type Mode = 'captains' | 'players'
type Tab = 'members' | 'guests'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  excludeIds: string[]
  onConfirm: (selectedUserIds: string[]) => Promise<void>
  /** 매물(players) 모드에서 비회원 명단 수기 등록 콜백. 제공 시 "수기 입력" 탭 노출. */
  onConfirmGuests?: (names: string[]) => Promise<void>
}

const TITLES: Record<Mode, { title: string; cta: string }> = {
  captains: { title: '팀장 추가', cta: '팀장으로 지정' },
  players: { title: '경매 매물 추가', cta: '매물로 추가' },
}

export function UserPickerDialog({
  open,
  onOpenChange,
  mode,
  excludeIds,
  onConfirm,
  onConfirmGuests,
}: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<Tab>('members')
  const [guestText, setGuestText] = useState('')

  const showGuestTab = mode === 'players' && !!onConfirmGuests

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: usersApi.list,
    staleTime: 60_000,
    enabled: open,
  })

  const filtered = useMemo(() => {
    const excludeSet = new Set(excludeIds)
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => !excludeSet.has(u.id))
      .filter((u) => {
        if (!q) return true
        return (
          u.username.toLowerCase().includes(q) ||
          (u.battleTag?.toLowerCase().includes(q) ?? false) ||
          (u.nickname?.toLowerCase().includes(q) ?? false)
        )
      })
  }, [users, excludeIds, search])

  const guestNames = useMemo(
    () =>
      guestText
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.length > 0),
    [guestText],
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reset = () => {
    setSelected(new Set())
    setSearch('')
    setGuestText('')
    setTab('members')
  }

  const handleConfirm = async () => {
    if (selected.size === 0) return
    setSubmitting(true)
    try {
      await onConfirm(Array.from(selected))
      reset()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmGuests = async () => {
    if (!onConfirmGuests || guestNames.length === 0) return
    setSubmitting(true)
    try {
      await onConfirmGuests(guestNames)
      reset()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle>{TITLES[mode].title}</DialogTitle>
        </DialogHeader>

        {showGuestTab && (
          <div className="flex gap-2 border-b border-border pb-3">
            <button
              onClick={() => setTab('members')}
              className={cn(
                'px-3 py-1 text-sm font-semibold rounded-sm transition-colors',
                tab === 'members'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              회원 선택
            </button>
            <button
              onClick={() => setTab('guests')}
              className={cn(
                'px-3 py-1 text-sm font-semibold rounded-sm transition-colors',
                tab === 'guests'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              수기 입력
            </button>
          </div>
        )}

        {tab === 'members' ? (
          <>
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="배틀태그 또는 사용자명 검색"
                  className="pl-9 bg-background"
                />
              </div>

              <div className="max-h-[400px] overflow-y-auto border border-border rounded-sm">
                {isLoading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-12">
                    {search ? '검색 결과가 없습니다.' : '추가 가능한 유저가 없습니다.'}
                  </p>
                ) : (
                  <ul>
                    {filtered.map((user) => {
                      const isSelected = selected.has(user.id)
                      return (
                        <li
                          key={user.id}
                          onClick={() => toggle(user.id)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-border/30 last:border-b-0 transition-colors',
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/30',
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggle(user.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatarUrl ?? undefined} />
                            <AvatarFallback className="bg-muted text-xs">
                              {(user.nickname ?? user.battleTag)?.[0] || user.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {user.nickname || user.battleTag || user.username}
                            </p>
                            {user.mainRole && (
                              <p className="text-xs text-muted-foreground uppercase">
                                {user.mainRole}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                선택됨: <span className="text-primary font-bold">{selected.size}</span>명
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose} disabled={submitting}>
                취소
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selected.size === 0 || submitting}
                className={cn(
                  'skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black',
                  'hover:bg-primary/90 transition-colors disabled:opacity-50',
                )}
              >
                <span className="skew-x-[10deg]">{TITLES[mode].cta}</span>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                회원가입하지 않은 매물은 이름을 <span className="text-foreground font-semibold">한 줄에 한 명씩</span> 붙여넣어 등록하세요. (게스트로 추가되며 회원 목록에는 표시되지 않습니다)
              </p>
              <textarea
                value={guestText}
                onChange={(e) => setGuestText(e.target.value)}
                placeholder={'홍길동\n김철수\n이영희'}
                rows={10}
                className={cn(
                  'w-full resize-y rounded-sm border border-border bg-background p-3 text-sm text-foreground',
                  'placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none',
                )}
              />
              <p className="text-xs text-muted-foreground">
                입력됨: <span className="text-primary font-bold">{guestNames.length}</span>명
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose} disabled={submitting}>
                취소
              </Button>
              <Button
                onClick={handleConfirmGuests}
                disabled={guestNames.length === 0 || submitting}
                className={cn(
                  'skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black',
                  'hover:bg-primary/90 transition-colors disabled:opacity-50',
                )}
              >
                <span className="skew-x-[10deg]">{guestNames.length}명 매물로 추가</span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
