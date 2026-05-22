'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { attendanceApi, type AttendanceUploadResponse, type AttendanceUploadResult } from '@/modules/admin/api/attendance'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload, Download, FileSpreadsheet } from 'lucide-react'

function downloadFailedCsv(results: AttendanceUploadResult[]) {
  const failed = results.filter((r) => r.status === 'FAIL')
  if (failed.length === 0) return

  const header = 'row,discordId,reason'
  const rows = failed.map(
    (r) => `${r.row},${r.discordId ?? ''},${r.reason ?? '알 수 없음'}`,
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'attendance-failed.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminAttendancePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<AttendanceUploadResponse | null>(null)

  const handleFile = async (file: File) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!allowed.includes(file.type) && !file.name.endsWith('.xlsx')) {
      toast.error('xlsx 파일만 업로드할 수 있습니다.')
      return
    }

    setUploading(true)
    setResult(null)
    try {
      const res = await attendanceApi.upload(file)
      setResult(res)
      if (res.failed === 0) {
        toast.success(`출석 처리 완료: ${res.success}명 성공`)
      } else {
        toast.warning(`${res.success}명 성공, ${res.failed}명 실패`)
      }
    } catch {
      toast.error('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black italic uppercase text-foreground">
        출석 관리
      </h1>

      {/* Drop Zone */}
      <div
        role="region"
        aria-label="파일 업로드 영역"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-sm border-2 border-dashed',
          'cursor-pointer transition-colors py-16',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/50',
          uploading && 'pointer-events-none opacity-60',
        )}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <FileSpreadsheet className="size-12 text-muted-foreground" />
        <div className="text-center space-y-1">
          <p className="font-semibold text-foreground">
            {uploading ? '업로드 중...' : 'xlsx 파일을 드래그하거나 클릭하여 선택'}
          </p>
          <p className="text-sm text-muted-foreground">
            열 구조: <span className="font-mono text-xs">discord_id, bonus</span> (헤더 포함)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
          disabled={uploading}
          aria-label="파일 선택"
        >
          <Upload className="size-4 mr-2" />
          파일 선택
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleInputChange}
          aria-label="xlsx 파일 업로드"
        />
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '전체', value: result.total, color: 'text-foreground' },
              { label: '성공', value: result.success, color: 'text-[var(--ow-blue)]' },
              { label: '실패', value: result.failed, color: result.failed > 0 ? 'text-[var(--ow-red)]' : 'text-muted-foreground' },
            ].map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-sm p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{card.label}</p>
                <p className={cn('text-3xl font-black tabular-nums', card.color)}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Download failed CSV */}
          {result.failed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFailedCsv(result.results)}
              aria-label="실패 행 CSV 다운로드"
            >
              <Download className="size-4 mr-2" />
              실패 행 CSV 다운로드 ({result.failed}건)
            </Button>
          )}

          {/* Result Table */}
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">행</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Discord ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">상태</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">실패 사유</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr
                    key={r.row}
                    className={cn(
                      'border-b border-border/50',
                      r.status === 'FAIL' && 'bg-destructive/5',
                    )}
                  >
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{r.row}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.discordId ?? '-'}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-sm text-xs font-bold',
                          r.status === 'SUCCESS'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-destructive/20 text-destructive',
                        )}
                      >
                        {r.status === 'SUCCESS' ? '성공' : '실패'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {r.status === 'FAIL' ? (
                        <span
                          title={r.reason}
                          className="cursor-help max-w-48 truncate block"
                        >
                          {r.reason ?? '알 수 없음'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
