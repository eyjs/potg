"use client"

import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog"
import { Button } from "@/common/components/ui/button"

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** "destructive" 시 확인 버튼이 빨간색 */
  variant?: "default" | "destructive"
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error("useConfirm must be used within ConfirmProvider")
  return fn
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
  })
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const handleClose = useCallback((result: boolean) => {
    setOpen(false)
    resolverRef.current?.(result)
    resolverRef.current = null
  }, [])

  return (
    <ConfirmContext value={confirm}>
      {children}

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(false) }}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{options.title}</DialogTitle>
            {options.description && (
              <DialogDescription className="text-muted-foreground text-sm">
                {options.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="font-bold"
            >
              {options.cancelText || "취소"}
            </Button>
            <Button
              variant={options.variant === "destructive" ? "destructive" : "default"}
              onClick={() => handleClose(true)}
              className="font-bold"
            >
              {options.confirmText || "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext>
  )
}
