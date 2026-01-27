"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch } from "@/common/components/ui/switch"

/**
 * 통일된 Active/Inactive 토글 스타일 시스템
 *
 * Active: bg-primary (주황) + text-primary-foreground
 * Inactive: bg-muted (회색) + text-muted-foreground
 *
 * 사용 컴포넌트:
 * - ToggleFilterButton: 단일 토글 버튼 (on/off)
 * - ToggleFilterGroup: 라디오/멀티 필터 그룹
 * - ToggleSwitch: 라벨 + Switch 조합
 */

// ========== 토글 버튼 (단일) ==========

interface ToggleFilterButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  size?: "sm" | "md"
}

export function ToggleFilterButton({
  active,
  onClick,
  children,
  className,
  size = "md",
}: ToggleFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-bold transition-all",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  )
}

// ========== 필터 그룹 (라디오 스타일) ==========

interface ToggleFilterGroupOption<T extends string> {
  value: T
  label: React.ReactNode
}

interface ToggleFilterGroupProps<T extends string> {
  options: ToggleFilterGroupOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: "sm" | "md"
}

export function ToggleFilterGroup<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: ToggleFilterGroupProps<T>) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg bg-muted/70 p-1", className)}>
      {options.map((option) => (
        <ToggleFilterButton
          key={option.value}
          active={value === option.value}
          onClick={() => onChange(option.value)}
          size={size}
        >
          {option.label}
        </ToggleFilterButton>
      ))}
    </div>
  )
}

// ========== 멀티 필터 (체크박스 스타일) ==========

interface ToggleFilterMultiProps<T extends string> {
  options: ToggleFilterGroupOption<T>[]
  values: T[]
  onChange: (values: T[]) => void
  className?: string
  size?: "sm" | "md"
}

export function ToggleFilterMulti<T extends string>({
  options,
  values,
  onChange,
  className,
  size = "md",
}: ToggleFilterMultiProps<T>) {
  const toggle = (val: T) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {options.map((option) => (
        <ToggleFilterButton
          key={option.value}
          active={values.includes(option.value)}
          onClick={() => toggle(option.value)}
          size={size}
        >
          {option.label}
        </ToggleFilterButton>
      ))}
    </div>
  )
}

// ========== 라벨 + Switch 조합 ==========

interface ToggleSwitchProps {
  label: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function ToggleSwitch({
  label,
  checked,
  onCheckedChange,
  className,
}: ToggleSwitchProps) {
  return (
    <label className={cn("inline-flex items-center gap-2 cursor-pointer select-none", className)}>
      <span className={cn(
        "text-xs font-bold transition-colors",
        checked ? "text-primary" : "text-muted-foreground",
      )}>
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}
