"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/common/components/ui/card"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Lock } from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"
import { handleApiError } from "@/lib/api-error"

export function SecuritySettingsCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  })

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.newPassword) return
    if (formData.newPassword !== formData.confirmNewPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다.")
      return
    }

    setIsLoading(true)
    try {
      await api.patch("/users/me", {
        password: formData.newPassword,
        currentPassword: formData.currentPassword,
      })
      toast.success("비밀번호가 변경되었습니다.")
      setFormData({ currentPassword: "", newPassword: "", confirmNewPassword: "" })
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
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-ow-blue">현재 비밀번호</Label>
            <Input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="bg-input border-border focus:border-ow-blue"
              placeholder="현재 비밀번호 입력"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-ow-blue">새 비밀번호</Label>
              <Input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="bg-input border-border focus:border-ow-blue"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-ow-blue">새 비밀번호 확인</Label>
              <Input
                type="password"
                value={formData.confirmNewPassword}
                onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
                className="bg-input border-border focus:border-ow-blue"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || !formData.newPassword}
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
