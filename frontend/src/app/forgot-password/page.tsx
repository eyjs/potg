"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Shield, CheckCircle } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import api from "@/lib/api"
import { handleApiError } from "@/lib/api-error"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setIsSubmitted(true)
    } catch (error) {
      handleApiError(error, "이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
      {/* Background Pattern */}
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

      {/* Header */}
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인으로 돌아가기
          </Link>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold italic uppercase tracking-wider text-foreground mb-2">
              비밀번호 찾기
            </h1>
            <p className="text-muted-foreground">가입한 이메일로 재설정 링크를 보내드립니다</p>
          </div>

          {/* Form Card */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 p-6 relative overflow-hidden">
            {/* Accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-accent" />

            {isSubmitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">이메일을 확인해주세요</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <span className="text-primary font-medium">{email}</span>로<br />
                  비밀번호 재설정 링크를 보내드렸습니다.
                </p>
                <p className="text-muted-foreground/70 text-xs mt-4">
                  이메일이 도착하지 않았다면 스팸함을 확인해주세요.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="가입한 이메일을 입력하세요"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[#1a1a1a] border-border/50 focus:border-primary h-12 text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider skew-btn disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        전송 중...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        재설정 링크 보내기
                      </>
                    )}
                  </span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-1">
          <Shield className="w-4 h-4 text-primary" />
          <span>POTG는 오버워치 팬 커뮤니티입니다</span>
        </div>
      </footer>
    </div>
  )
}
