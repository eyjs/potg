"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
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
import { Save } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"
import api from "@/lib/api"
import { toast } from "sonner"
import { handleApiError } from "@/lib/api-error"
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/modules/my-info/schemas/update-profile.schema"

interface AccountSettingsCardProps {
  username: string
  battleTag: string
  avatarUrl: string
  onSuccess?: () => void
}

export function AccountSettingsCard({
  username,
  battleTag: initialBattleTag,
  avatarUrl: initialAvatarUrl,
  onSuccess,
}: AccountSettingsCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    mode: "onSubmit",
    defaultValues: {
      battleTag: initialBattleTag,
      avatarUrl: initialAvatarUrl,
    },
  })
  const errors = form.formState.errors

  const onValid = async (values: UpdateProfileFormValues) => {
    setIsLoading(true)
    try {
      await api.patch("/users/me", {
        battleTag: values.battleTag,
        avatarUrl: values.avatarUrl,
      })
      toast.success("프로필 정보가 저장되었습니다.")
      onSuccess?.()
    } catch (error) {
      handleApiError(error, "저장 실패")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="w-5 h-5 text-primary" /> 계정 설정
        </CardTitle>
        <CardDescription>공개적으로 표시되는 정보를 변경합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onValid)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">
                아이디 (변경 불가)
              </Label>
              <Input
                value={username}
                disabled
                className="bg-muted/20 border-border/50 opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="battleTag" className="text-xs uppercase font-bold text-primary">
                배틀태그
              </Label>
              <Input
                id="battleTag"
                {...form.register("battleTag")}
                className="bg-input border-border focus:border-primary transition-all"
              />
              {errors.battleTag && (
                <p className="text-destructive text-xs">{errors.battleTag.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-primary">프로필 이미지</Label>
            <Controller
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <ImageUploader
                  value={field.value ? [field.value] : []}
                  onChange={(urls) => field.onChange(urls[0] || "")}
                  maxCount={1}
                />
              )}
            />
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || form.formState.isSubmitting}
              className="bg-primary text-black font-black uppercase px-8 rounded-md h-11 transition-transform active:scale-95"
            >
              변경사항 저장
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
