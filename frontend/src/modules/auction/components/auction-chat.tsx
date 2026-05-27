"use client"

import { Send } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"

interface ChatMessage {
  id: string
  userName: string
  message: string
}

interface AuctionChatProps {
  messages: ChatMessage[]
  chatInput: string
  onChatInputChange: (value: string) => void
  onSend: () => void
}

/**
 * 경매방 채팅 패널 (데스크탑 전용).
 * 메시지 리스트 + 입력 + 전송 버튼.
 */
export function AuctionChat({
  messages,
  chatInput,
  onChatInputChange,
  onSend,
}: AuctionChatProps) {
  return (
    <Card className="border-border/50 hidden md:block">
      <CardHeader className="pb-2">
        <h3 className="font-bold uppercase tracking-wide">채팅</h3>
      </CardHeader>
      <CardContent>
        <div className="h-48 overflow-y-auto space-y-2 mb-3 bg-muted/30 rounded p-2">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              아직 메시지가 없습니다
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="font-semibold text-primary">{msg.userName}: </span>
                <span>{msg.message}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="메시지 입력..."
            className="flex-1 bg-muted rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="icon" onClick={onSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
