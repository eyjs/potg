'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomState } from '../../types'
import type { AuctionChatMessage } from '../../hooks/use-auction-socket'

interface Props {
  messages: AuctionChatMessage[]
  onSend: (message: string) => void
  /** userId → 닉네임 매핑용 (백엔드 chat 이벤트는 로그인 id 만 실어줌) */
  participants?: RoomState['participants']
  myUserId?: string | null
}

/** 닉네임 색 — 생방송 채팅처럼 유저별로 구분되는 고대비 팔레트. */
const NAME_COLORS = [
  'text-ow-blue',
  'text-ow-gold',
  'text-emerald-400',
  'text-pink-400',
  'text-violet-400',
  'text-orange-400',
  'text-cyan-300',
  'text-lime-400',
]

function colorFor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length]
}

/**
 * 경매방 실시간 채팅 (치지직 스타일 상시 사이드 채팅).
 * 컬럼 높이를 가득 채우고, 새 메시지 수신 시 하단으로 자동 스크롤한다
 * (사용자가 위로 스크롤해 읽는 중이면 유지).
 */
export function ChatPanel({ messages, onSend, participants, myUserId }: Props) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  const nameOf = (m: AuctionChatMessage): string => {
    const p = participants?.find((x) => x.userId === m.userId)
    return p?.user?.nickname || p?.user?.battleTag?.split('#')[0] || m.userName
  }

  useEffect(() => {
    const el = listRef.current
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
    stickToBottomRef.current = true
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col min-h-[20rem]">
      <CardContent className="p-3 flex flex-col flex-1 min-h-0 gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          <MessageSquare className="w-3.5 h-3.5" />
          실시간 채팅
          <span className="ml-auto flex items-center gap-1 text-[10px] normal-case tracking-normal text-ow-red">
            <span className="w-1.5 h-1.5 rounded-full bg-ow-red animate-pulse" />
            LIVE
          </span>
        </h3>

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-1 text-xs"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              첫 메시지를 남겨보세요.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="leading-snug break-words rounded px-1.5 py-0.5 hover:bg-muted/20"
              >
                <span
                  className={cn(
                    'font-bold mr-1.5',
                    m.userId === myUserId ? 'text-primary' : colorFor(m.userId),
                  )}
                >
                  {nameOf(m)}
                </span>
                <span className="text-foreground/90">{m.message}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="메시지 입력..."
            maxLength={200}
            className="h-8 text-xs bg-background"
            aria-label="채팅 메시지"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!draft.trim()}
            className="h-8 px-2.5 bg-primary text-black hover:bg-primary/90 disabled:opacity-40"
            aria-label="전송"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
