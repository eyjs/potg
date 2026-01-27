"use client"

import { useState } from "react"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Textarea } from "@/common/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select"
import { Send, Coins, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { handleApiError } from "@/lib/api-error"
import type { ClanMemberWithUser } from "../types"

interface SendPointsFormProps {
  clanMembers: ClanMemberWithUser[]
  currentUserId: string
  clanId: string
  userBalance: number
  onSendSuccess: () => void
}

export function SendPointsForm({
  clanMembers,
  currentUserId,
  clanId,
  userBalance,
  onSendSuccess,
}: SendPointsFormProps) {
  const [selectedRecipient, setSelectedRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Filter out current user from recipients
  const availableRecipients = clanMembers.filter(
    (m) => m.userId !== currentUserId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRecipient) {
      toast.error("받는 사람을 선택하세요")
      return
    }

    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount < 1) {
      toast.error("최소 1P 이상 전송 가능합니다")
      return
    }

    if (numAmount > userBalance) {
      toast.error("보유 포인트가 부족합니다")
      return
    }

    setIsSending(true)
    try {
      await api.post("/wallet/send", {
        recipientId: selectedRecipient,
        clanId,
        amount: numAmount,
        message: message.trim() || undefined,
      })

      const recipient = availableRecipients.find(
        (m) => m.userId === selectedRecipient
      )
      toast.success(
        `${recipient?.user.battleTag}님에게 ${numAmount.toLocaleString()}P를 전송했습니다`
      )

      // Reset form
      setSelectedRecipient("")
      setAmount("")
      setMessage("")
      onSendSuccess()
    } catch (error) {
      handleApiError(error, "포인트 전송에 실패했습니다")
    } finally {
      setIsSending(false)
    }
  }

  const numAmount = Number(amount) || 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Balance Display */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold uppercase text-muted-foreground">
              전송 가능 포인트
            </span>
          </div>
          <span className="text-2xl font-black italic text-primary">
            {userBalance.toLocaleString()}P
          </span>
        </div>
      </div>

      {/* Recipient Selection */}
      <div className="space-y-2">
        <Label htmlFor="recipient" className="font-bold uppercase text-xs">
          받는 사람
        </Label>
        <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="클랜원을 선택하세요" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {availableRecipients.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                전송 가능한 클랜원이 없습니다
              </div>
            ) : (
              availableRecipients.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {member.user.battleTag}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({member.role})
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="font-bold uppercase text-xs">
          전송 금액
        </Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            min="1"
            max={userBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="bg-card border-border pr-8 text-lg font-bold"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-bold">
            P
          </span>
        </div>
        {numAmount > userBalance && (
          <div className="flex items-center gap-1 text-destructive text-xs">
            <AlertCircle className="w-3 h-3" />
            보유 포인트를 초과했습니다
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <Label htmlFor="message" className="font-bold uppercase text-xs">
          메시지 <span className="text-muted-foreground">(선택)</span>
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="전송 메시지를 입력하세요"
          className="bg-card border-border resize-none"
          rows={3}
          maxLength={100}
        />
        <div className="text-right text-xs text-muted-foreground">
          {message.length}/100
        </div>
      </div>

      {/* Preview */}
      {selectedRecipient && numAmount > 0 && (
        <div className="p-4 bg-card border border-border rounded-lg">
          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
            전송 미리보기
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">받는 사람</span>
              <span className="font-semibold">
                {
                  availableRecipients.find((m) => m.userId === selectedRecipient)
                    ?.user.battleTag
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">전송 금액</span>
              <span className="font-bold text-primary">
                {numAmount.toLocaleString()}P
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">전송 후 잔액</span>
              <span className="font-semibold">
                {(userBalance - numAmount).toLocaleString()}P
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={
          isSending ||
          !selectedRecipient ||
          numAmount < 1 ||
          numAmount > userBalance
        }
        className="w-full skew-btn bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase"
      >
        {isSending ? (
          <span className="animate-pulse">전송 중...</span>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            포인트 전송
          </>
        )}
      </Button>
    </form>
  )
}
