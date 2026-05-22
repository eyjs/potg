'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/common/components/ui/skeleton'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
}

interface PaginationConfig {
  skip: number
  take: number
  total: number
  onChange: (skip: number) => void
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  loading?: boolean
  emptyMessage?: string
  pagination?: PaginationConfig
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
  pagination,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-sm" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center py-16 text-muted-foreground text-sm',
          className,
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  const currentPage = pagination
    ? Math.floor(pagination.skip / pagination.take) + 1
    : 1
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.take)
    : 1

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-border/50 transition-colors',
                  onRowClick
                    ? 'cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:bg-muted/30'
                    : '',
                )}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onRowClick(row)
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-2.5 text-foreground whitespace-nowrap"
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {pagination.skip + 1}–
            {Math.min(pagination.skip + pagination.take, pagination.total)} /{' '}
            {pagination.total}건
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                pagination.onChange(
                  Math.max(0, pagination.skip - pagination.take),
                )
              }
              disabled={pagination.skip === 0}
              className={cn(
                'px-3 py-1 rounded-sm border border-border transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="이전 페이지"
            >
              ‹
            </button>
            <span className="px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                pagination.onChange(pagination.skip + pagination.take)
              }
              disabled={
                pagination.skip + pagination.take >= pagination.total
              }
              className={cn(
                'px-3 py-1 rounded-sm border border-border transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
