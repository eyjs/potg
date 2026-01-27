"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Shield, CheckCircle, XCircle, Check, X, KeyRound } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import api from "@/lib/api"
import { toast } from "sonner"
import { handleApiError } from "@/lib/api-error"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  const passwordChecks = {
    length: formData.password.length >= 8,
    hasNumber: /\d/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
    match: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0,
  }

  const isFormValid = passwordChecks.length && passwordChecks.hasNumber && passwordChecks.match

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerifying(false)
        return
      }

      try {
        const response = await api.get(`/auth/verify-reset-token?token=${token}`)
        setIsValidToken(response.data.valid)
      } catch (error) {
        handleApiError(error)
        setIsValidToken(false)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || !token) return

    setIsLoading(true)
    try {
      await api.post("/auth/reset-password", {
        token,
        password: formData.password,
      })
      setIsSuccess(true)
      toast.success("비밀번호가 성공적으로 변경되었습니다.")
    } catch (error) {
      handleApiError(error, "비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const PasswordCheck = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? "text-green-500" : "text-muted-foreground"}`}>
      {valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  )

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">토큰 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!token || !isValidToken) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rotate-12" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-accent/5 to-transparent -rotate-12" />
        </div>

        <header className="relative z-10 p-6">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="h-10 w-10 bg-primary skew-btn flex items-center justify-center">
              <span className="text-primary-foreground font-extrabold text-lg italic">P</span>
            </div>
            <span className="font-extrabold text-xl italic tracking-wider text-foreground">
              POTG
            </span>
          </Link>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive via-destructive to-destructive/50" />

              <div className="text-center py-6">
                <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">유효하지 않은 링크</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.<br />
                  다시 비밀번호 찾기를 시도해주세요.
                </p>
                <Link href="/forgot-password">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider">
                    비밀번호 찾기로 이동
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="relative z-10 p-6 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-4 h-4 text-primary" />
            <span>POTG는 오버워치 팬 커뮤니티입니다</span>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rotate-12" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-accent/5 to-transparent -rotate-12" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(249, 158, 26, 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(249, 158, 26, 0.3) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <header className="relative z-10 p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="h-10 w-10 bg-primary skew-btn flex items-center justify-center">
            <span className="text-primary-foreground font-extrabold text-lg italic">P</span>
          </div>
          <span className="font-extrabold text-xl italic tracking-wider text-foreground">
            POTG
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold italic uppercase tracking-wider text-foreground mb-2">
              비밀번호 재설정
            </h1>
            <p className="text-muted-foreground">새로운 비밀번호를 입력해주세요</p>
          </div>

          <div className="bg-card/80 backdrop-blur-sm border border-border/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-accent" />

            {isSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">비밀번호 변경 완료</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  새로운 비밀번호로 로그인해주세요.
                </p>
                <Button
                  onClick={() => router.push("/login")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
                >
                  로그인하러 가기
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    새 비밀번호
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="새 비밀번호를 입력하세요"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="bg-[#1a1a1a] border-border/50 focus:border-primary h-12 text-foreground placeholder:text-muted-foreground/50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="space-y-1 pt-1">
                    <PasswordCheck valid={passwordChecks.length} label="8자 이상" />
                    <PasswordCheck valid={passwordChecks.hasNumber} label="숫자 포함" />
                    <PasswordCheck valid={passwordChecks.hasSpecial} label="특수문자 포함 (선택)" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    비밀번호 확인
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="비밀번호를 다시 입력하세요"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      className={`bg-[#1a1a1a] border-border/50 focus:border-primary h-12 text-foreground placeholder:text-muted-foreground/50 pr-12 ${
                        formData.confirmPassword && !passwordChecks.match ? "border-destructive" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <PasswordCheck
                      valid={passwordChecks.match}
                      label={passwordChecks.match ? "비밀번호 일치" : "비밀번호가 일치하지 않습니다"}
                    />
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider skew-btn disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        변경 중...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-5 h-5" />
                        비밀번호 변경
                      </>
                    )}
                  </span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 p-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-1">
          <Shield className="w-4 h-4 text-primary" />
          <span>POTG는 오버워치 팬 커뮤니티입니다</span>
        </div>
      </footer>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
