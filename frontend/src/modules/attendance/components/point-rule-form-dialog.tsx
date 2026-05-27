"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Switch } from "@/common/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select"
import { cn } from "@/lib/utils"
import {
  pointRuleFormSchema,
  type PointRuleFormValues,
} from "@/modules/attendance/schemas/point-rule.schema"
import type { PointRule, PointRuleCategory } from "../types"

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PointRuleFormDialogProps {
  dialogProps: DialogProps
  editingRule: PointRule | null
  onSubmit: (data: {
    code: string
    name: string
    description?: string
    category: PointRuleCategory
    points: number
    isActive: boolean
  }) => Promise<void> | void
  onClose: () => void
}

const DEFAULTS: PointRuleFormValues = {
  code: "",
  name: "",
  description: "",
  category: "ATTENDANCE",
  points: "100",
  isActive: true,
}

/**
 * 포인트 규칙 생성/수정 다이얼로그.
 *
 * editingRule 이 바뀌면 form 을 reset 한다.
 * 제출 시 points 는 parseInt 후 부모 onSubmit 으로 전달.
 */
export function PointRuleFormDialog({
  dialogProps,
  editingRule,
  onSubmit,
  onClose,
}: PointRuleFormDialogProps) {
  const form = useForm<PointRuleFormValues>({
    resolver: zodResolver(pointRuleFormSchema),
    defaultValues: DEFAULTS,
  })
  const errors = form.formState.errors

  // 편집 대상이 바뀔 때 form reset.
  useEffect(() => {
    if (editingRule) {
      form.reset({
        code: editingRule.code,
        name: editingRule.name,
        description: editingRule.description || "",
        category: editingRule.category,
        points: String(editingRule.points),
        isActive: editingRule.isActive,
      })
    } else {
      form.reset(DEFAULTS)
    }
    // form 객체는 stable — eslint-disable 위해 form.reset 만 의존성에.
  }, [editingRule, form])

  const handleValid = async (values: PointRuleFormValues) => {
    await onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      category: values.category,
      points: parseInt(values.points, 10),
      isActive: values.isActive,
    })
  }

  return (
    <Dialog {...dialogProps}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{editingRule ? "규칙 수정" : "규칙 추가"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleValid)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label>코드</Label>
            <Input
              {...form.register("code")}
              placeholder="ATTENDANCE_BASE"
              className="bg-background"
            />
            {errors.code && (
              <p className="text-destructive text-xs">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>이름</Label>
            <Input
              {...form.register("name")}
              placeholder="출석 기본 포인트"
              className="bg-background"
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>설명 (선택)</Label>
            <Input
              {...form.register("description")}
              placeholder="규칙에 대한 설명"
              className="bg-background"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as PointRuleCategory)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATTENDANCE">출석</SelectItem>
                      <SelectItem value="ACTIVITY">활동</SelectItem>
                      <SelectItem value="ACHIEVEMENT">업적</SelectItem>
                      <SelectItem value="PENALTY">페널티</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>포인트</Label>
              <Input
                type="number"
                {...form.register("points")}
                placeholder="100"
                className="bg-background"
              />
              {errors.points && (
                <p className="text-destructive text-xs">{errors.points.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
              )}
            />
            <Label>활성화</Label>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className={cn(
                "skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black",
                "hover:bg-primary/90 transition-colors",
              )}
            >
              <span className="skew-x-[10deg]">
                {editingRule ? "수정" : "생성"}
              </span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
