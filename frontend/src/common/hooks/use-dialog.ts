"use client"

import { useState, useCallback, useEffect, useRef } from "react"

/**
 * 모달/다이얼로그 열림 시 브라우저 뒤로가기로 닫히도록 처리하는 hook.
 * history.pushState + popstate 이벤트 리스너 방식.
 */
export function useDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const isOpenRef = useRef(false)

  const open = useCallback(() => {
    setIsOpen(true)
    isOpenRef.current = true
    window.history.pushState({ dialog: true }, "")
  }, [])

  const close = useCallback(() => {
    if (!isOpenRef.current) return
    setIsOpen(false)
    isOpenRef.current = false
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      if (isOpenRef.current) {
        setIsOpen(false)
        isOpenRef.current = false
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const onOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      open()
    } else {
      // 사용자가 X 버튼이나 overlay 클릭으로 닫을 때 history.back()으로 pushState 엔트리 제거
      if (isOpenRef.current) {
        isOpenRef.current = false
        setIsOpen(false)
        window.history.back()
      }
    }
  }, [open])

  return {
    isOpen,
    open,
    close,
    /** Dialog 컴포넌트의 open / onOpenChange에 바로 전달 */
    dialogProps: {
      open: isOpen,
      onOpenChange,
    },
  }
}
