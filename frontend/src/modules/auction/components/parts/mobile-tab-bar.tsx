'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 하단 탭바에 노출되는 단일 탭 정의.
 * `T`는 화면별 탭 id union 타입(예: `'auction' | 'status'`).
 */
export interface MobileTabItem<T extends string> {
  /** 탭 식별자(부모가 관리하는 activeTab union 값과 매칭) */
  value: T
  /** 탭 라벨(대문자 소형 표기) */
  label: string
  /** lucide-react 아이콘 컴포넌트 */
  icon: LucideIcon
}

export interface MobileTabBarProps<T extends string> {
  /** 탭 목록(P1에서 매물 탭 등 확장 시 배열만 늘리면 됨) */
  tabs: readonly MobileTabItem<T>[]
  /** 현재 활성 탭(부모 state 소유 — 이 컴포넌트는 상태를 소유하지 않음) */
  activeTab: T
  /** 탭 클릭 시 호출되는 콜백 */
  onTabChange: (value: T) => void
  /** tablist에 부여할 접근성 라벨(기본값 제공) */
  ariaLabel?: string
  /** 추가 클래스(레이아웃 배치용) */
  className?: string
}

/**
 * 모바일 하단 고정 탭 네비게이션 바.
 *
 * - 순수 controlled 컴포넌트: 내부 state 없이 `activeTab`/`onTabChange`로만 동작한다.
 * - `role="tablist"` + 각 버튼 `role="tab"`/`aria-selected`로 접근성을 충족한다.
 * - 각 탭 터치 타겟은 `h-14`(56px, WCAG 44px 기준 충족)로 고정된다.
 * - 활성 탭은 오버워치 골드 네온(`text-primary` + 상단 보더 + drop-shadow)으로 강조된다.
 * - `.game-btn` 클래스를 재사용하므로 `prefers-reduced-motion` 시 트랜지션이
 *   globals.css의 전역 규칙에 의해 자동으로 제거된다(신규 CSS 불필요).
 */
export function MobileTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = '경매 화면 전환',
  className,
}: MobileTabBarProps<T>) {
  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'game-panel shrink-0 h-14 flex border-t-2 border-primary/30 bg-background/95 backdrop-blur-sm',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value
        const Icon = tab.icon

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              'game-btn flex-1 flex flex-col items-center justify-center gap-0.5 h-full min-w-11',
              isActive
                ? 'text-primary border-t-2 border-primary -mt-0.5 drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="w-5 h-5" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
