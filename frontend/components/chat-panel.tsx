"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/app/auction/[id]/page"

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
}

export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput("")
  }

  return (
    <Card className="bg-card border-border/50 flex-1 flex flex-col max-h-[300px]">
      <CardHeader className="pb-2">
        <h2 className="font-bold text-sm italic uppercase tracking-wide text-foreground">
          실시간 <span className="text-accent">채팅</span>
        </h2>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 pt-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-[150px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "text-sm",
                msg.type === "system" && "text-muted-foreground italic",
                msg.type === "bid" && "text-primary font-semibold",
              )}
            >
              {msg.type === "chat" && <span className="font-semibold text-foreground">{msg.userName}: </span>}
              {msg.type === "bid" && <span className="text-accent">[BID] {msg.userName} </span>}
              {msg.type === "system" && <span className="text-muted-foreground">[시스템] </span>}
              <span className={msg.type === "chat" ? "text-muted-foreground" : ""}>{msg.message}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 bg-input border-border text-foreground text-sm"
          />
          <Button type="submit" size="icon" className="bg-accent hover:bg-accent/90">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
