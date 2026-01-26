"use client"

import { useCallback, useRef, useState } from "react"
import { X, Upload, ImagePlus, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadImage } from "@/lib/upload"
import { getImageUrl } from "@/lib/upload"
import { toast } from "sonner"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

interface ImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxCount?: number
  maxSize?: number // bytes
  disabled?: boolean
  className?: string
}

interface UploadingFile {
  id: string
  name: string
  preview: string
  progress: number
}

export function ImageUploader({
  value,
  onChange,
  maxCount = 5,
  maxSize = 5 * 1024 * 1024,
  disabled = false,
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const remaining = maxCount - value.length - uploading.length

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return `${file.name}: 허용되지 않는 형식입니다 (jpeg, png, gif, webp만 가능)`
      }
      if (file.size > maxSize) {
        return `${file.name}: 파일 크기 초과 (최대 ${Math.round(maxSize / 1024 / 1024)}MB)`
      }
      return null
    },
    [maxSize],
  )

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)

      if (fileArray.length > remaining) {
        toast.error(`최대 ${maxCount}장까지 업로드 가능합니다. (남은 슬롯: ${remaining})`)
        return
      }

      // Validate all files first
      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          toast.error(error)
          return
        }
      }

      // Upload files one by one with progress
      for (const file of fileArray) {
        const id = `${Date.now()}-${Math.random()}`
        const preview = URL.createObjectURL(file)

        setUploading((prev) => [...prev, { id, name: file.name, preview, progress: 0 }])

        try {
          const result = await uploadImage(file, (progress) => {
            setUploading((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress } : u)),
            )
          })
          onChange([...value, result.url])
        } catch {
          toast.error(`${file.name} 업로드 실패`)
        } finally {
          URL.revokeObjectURL(preview)
          setUploading((prev) => prev.filter((u) => u.id !== id))
        }
      }
    },
    [remaining, maxCount, validateFile, onChange, value],
  )

  const handleRemove = (index: number) => {
    const next = [...value]
    next.splice(index, 1)
    onChange(next)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ""
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Thumbnail Grid */}
      {(value.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/30">
              <img
                src={getImageUrl(url)}
                alt={`사진 ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {i === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  대표
                </div>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
          {uploading.map((u) => (
            <div key={u.id} className="relative aspect-square rounded-lg overflow-hidden border border-primary/50 bg-muted/30">
              <img src={u.preview} alt={u.name} className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {remaining > 0 && !disabled && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          {isDragging ? (
            <Upload className="w-8 h-8 text-primary" />
          ) : (
            <ImagePlus className="w-8 h-8 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "여기에 놓으세요" : "클릭 또는 드래그하여 업로드"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, GIF, WebP · 최대 {Math.round(maxSize / 1024 / 1024)}MB · 남은 슬롯: {remaining}장
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
      />
    </div>
  )
}
