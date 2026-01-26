"use client"

import { useCallback, useEffect, useState } from "react"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getImageUrl } from "@/lib/upload"

interface ImageViewerProps {
  images: string[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

export function ImageViewer({ images, initialIndex = 0, open, onClose }: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (open) {
      setIndex(initialIndex)
      setScale(1)
    }
  }, [open, initialIndex])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length)
    setScale(1)
  }, [images.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length)
    setScale(1)
  }, [images.length])

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.5, 4))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.5, 0.5))
  }, [])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowRight":
          goNext()
          break
        case "ArrowLeft":
          goPrev()
          break
        case "+":
        case "=":
          zoomIn()
          break
        case "-":
          zoomOut()
          break
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        setScale((s) => Math.min(s + 0.2, 4))
      } else {
        setScale((s) => Math.max(s - 0.2, 0.5))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("wheel", handleWheel)
    }
  }, [open, onClose, goNext, goPrev, zoomIn, zoomOut])

  if (!open || images.length === 0) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
            {index + 1} / {images.length}
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <span className="text-white/60 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Image */}
          <motion.img
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            src={getImageUrl(images[index])}
            alt={`이미지 ${index + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            draggable={false}
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
