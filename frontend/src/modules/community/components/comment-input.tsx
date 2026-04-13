"use client"

import { useState } from "react"
import { Button } from "@/common/components/ui/button"
import { Send } from "lucide-react"

interface CommentInputProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function CommentInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "댓글을 입력하세요...",
}: CommentInputProps) {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "로그인 후 댓글을 작성할 수 있습니다" : placeholder}
        disabled={disabled || isLoading}
        maxLength={1000}
        rows={1}
        className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm bg-muted/50 border border-border/50 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 placeholder:text-muted-foreground/50"
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={disabled || isLoading || !content.trim()}
        className="h-10 w-10 flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
