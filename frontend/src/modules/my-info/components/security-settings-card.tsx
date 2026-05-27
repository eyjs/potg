"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Lock } from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"
import { handleApiError } from "@/lib/api-error"
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/modules/auth/schemas/change-password.schema"

export function SecuritySettingsCard() {
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onSubmit",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  })
  const errors = form.formState.errors

  const onValid = async (values: ChangePasswordFormValues) => {
    setIsLoading(true)
    try {
      await api.patch("/users/me", {
        password: values.newPassword,
        currentPassword: values.currentPassword,
      })
      toast.success("비밀번호가 변경되었습니다.")
      form.reset()
    } catch (error) {
      handleApiError(error, "비밀번호 변경 실패")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-ow-blue" /> 보안 설정
        </CardTitle>
        <CardDescription>계정의 비밀번호를 안전하게 변경합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onValid)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-ow-blue">현재 비밀번호</Label>
            <Input
              type="password"
              {...form.register("currentPassword")}
              className="bg-input border-border focus:border-ow-blue"
              placeholder="현재 비밀번호 입력"
            />
            {errors.currentPassword && (
              <p className="text-destructive text-xs">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-ow-blue">새 비밀번호</Label>
              <Input
                type="password"
                {...form.register("newPassword")}
                className="bg-input border-border focus:border-ow-blue"
              />
              {errors.newPassword && (
                <p className="text-destructive text-xs">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-ow-blue">새 비밀번호 확인</Label>
              <Input
                type="password"
                {...form.register("confirmNewPassword")}
                className="bg-input border-border focus:border-ow-blue"
              />
              {errors.confirmNewPassword && (
                <p className="text-destructive text-xs">{errors.confirmNewPassword.message}</p>
              )}
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || form.formState.isSubmitting}
              className="bg-ow-blue text-black font-black uppercase px-8 rounded-md h-11 transition-transform active:scale-95"
            >
              비밀번호 업데이트
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
