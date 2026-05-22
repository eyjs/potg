'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { configApi, type SystemConfig } from '@/modules/admin/api/config'
import { Input } from '@/common/components/ui/input'
import { Button } from '@/common/components/ui/button'
import { Skeleton } from '@/common/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Pencil, Check, X } from 'lucide-react'

interface EditingState {
  key: string
  value: string
}

export default function AdminConfigPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: () => configApi.list(),
  })

  const startEdit = (config: SystemConfig) => {
    setEditing({ key: config.key, value: config.value })
  }

  const cancelEdit = () => {
    setEditing(null)
  }

  const handleSave = async (config: SystemConfig) => {
    if (!editing || editing.key !== config.key) return
    if (editing.value === config.value) {
      setEditing(null)
      return
    }

    setSavingKey(config.key)
    try {
      await configApi.update(config.key, { value: editing.value })
      toast.success(`'${config.key}' 설정이 저장되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'config'] })
      setEditing(null)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400) {
        toast.error('잘못된 값 형식입니다. 다시 확인하세요.')
      } else {
        toast.error('저장에 실패했습니다.')
      }
    } finally {
      setSavingKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black italic uppercase text-foreground">시스템 설정</h1>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-sm" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black italic uppercase text-foreground">
        시스템 설정
      </h1>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-48">설정 키</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">값</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">설명</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-32">수정일</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-24">액션</th>
            </tr>
          </thead>
          <tbody>
            {configs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  설정 항목이 없습니다.
                </td>
              </tr>
            ) : (
              configs.map((config) => {
                const isEditing = editing?.key === config.key
                const isSaving = savingKey === config.key

                return (
                  <tr key={config.key} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[var(--ow-blue)]">{config.key}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={editing.value}
                          onChange={(e) => setEditing({ key: config.key, value: e.target.value })}
                          className="h-8 text-sm font-mono max-w-64"
                          autoFocus
                          aria-label={`${config.key} 값 편집`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(config)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      ) : (
                        <span className="font-mono text-sm">{config.value}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                      {config.description ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(config.updatedAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSave(config)}
                            disabled={isSaving}
                            className={cn(
                              'p-1.5 rounded-sm text-green-400 hover:bg-green-900/30 transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                            )}
                            aria-label="저장"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={isSaving}
                            className={cn(
                              'p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                            )}
                            aria-label="취소"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(config)}
                          className={cn(
                            'p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                          aria-label={`${config.key} 편집`}
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        * 숫자 형식이 필요한 항목에 비숫자 값 입력 시 서버에서 오류를 반환합니다.
      </p>
    </div>
  )
}
