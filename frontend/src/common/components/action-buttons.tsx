"use client"

import React from "react"
import { Button } from "@/common/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react"

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  size?: "default" | "sm" | "lg" | "icon"
}

function ActionButton({
  className,
  loading,
  disabled,
  children,
  icon: Icon,
  ...props
}: ActionButtonProps & { icon: React.ElementType }) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn("font-bold italic uppercase tracking-tight", className)}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {children}
    </Button>
  )
}

export function AddButton({ children = "추가", className, ...props }: ActionButtonProps) {
  return (
    <ActionButton
      icon={Plus}
      className={cn("bg-primary hover:bg-primary/90 text-black", className)}
      {...props}
    >
      {children}
    </ActionButton>
  )
}

export function DeleteButton({ children = "삭제", className, ...props }: ActionButtonProps) {
  return (
    <ActionButton
      icon={Trash2}
      className={cn("bg-destructive hover:bg-destructive/90 text-white", className)}
      {...props}
    >
      {children}
    </ActionButton>
  )
}

export function EditButton({ children = "수정", className, ...props }: ActionButtonProps) {
  return (
    <ActionButton
      icon={Pencil}
      className={cn("bg-primary hover:bg-primary/90 text-black", className)}
      {...props}
    >
      {children}
    </ActionButton>
  )
}

export function SaveButton({ children = "저장", className, ...props }: ActionButtonProps) {
  return (
    <ActionButton
      icon={Check}
      className={cn("bg-primary hover:bg-primary/90 text-black", className)}
      {...props}
    >
      {children}
    </ActionButton>
  )
}

export function CancelButton({ children = "취소", className, ...props }: ActionButtonProps) {
  return (
    <ActionButton
      icon={X}
      className={cn("bg-muted hover:bg-muted/80 text-muted-foreground", className)}
      {...props}
    >
      {children}
    </ActionButton>
  )
}
