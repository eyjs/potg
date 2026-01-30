"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/common/components/ui/card"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Save } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"
import api from "@/lib/api"
import { toast } from "sonner"
import { handleApiError } from "@/lib/api-error"

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
  const [formData, setFormData] = useState({
    battleTag: initialBattleTag,
    avatarUrl: initialAvatarUrl,
  })

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await api.patch("/users/me", {
        battleTag: formData.battleTag,
        avatarUrl: formData.avatarUrl,
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
        <form onSubmit={handleUpdateProfile} className="space-y-4">
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
                value={formData.battleTag}
                onChange={(e) => setFormData({ ...formData, battleTag: e.target.value })}
                className="bg-input border-border focus:border-primary transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-primary">프로필 이미지</Label>
            <ImageUploader
              value={formData.avatarUrl ? [formData.avatarUrl] : []}
              onChange={(urls) => setFormData({ ...formData, avatarUrl: urls[0] || "" })}
              maxCount={1}
            />
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
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
