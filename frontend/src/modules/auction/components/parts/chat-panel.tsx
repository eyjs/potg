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

/**
 * 경매방 실시간 채팅.
 * 메시지 수신 시 목록 하단으로 자동 스크롤 (사용자가 위로 스크롤해 읽는 중이면 유지).
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
    <Card className="bg-card border-border">
      <CardContent className="p-3 space-y-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          <MessageSquare className="w-3.5 h-3.5" />
          채팅
        </h3>

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="h-48 overflow-y-auto space-y-1.5 pr-1 text-xs"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              아직 메시지가 없습니다.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="leading-snug break-words">
                <span
                  className={cn(
                    'font-bold mr-1.5',
                    m.userId === myUserId ? 'text-primary' : 'text-ow-blue',
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
