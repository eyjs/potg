"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LogIn, Shield } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Checkbox } from "@/common/components/ui/checkbox"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await api.post('/auth/login', {
        username: formData.username,
        password: formData.password
      })
      await login(response.data.access_token)
      router.replace("/")
    } catch (error) {
      console.error(error)
      toast.error("로그인 실패: 아이디나 비밀번호를 확인해주세요.")
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
        {/* Grid pattern */}
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
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold italic uppercase tracking-wider text-foreground mb-2">로그인</h1>
            <p className="text-muted-foreground">POTG에 오신 것을 환영합니다</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 p-6 relative overflow-hidden">
            {/* Accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-accent" />

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  아이디
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="bg-[#1a1a1a] border-border/50 focus:border-primary h-12 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  비밀번호
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
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
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => setFormData({ ...formData, rememberMe: checked as boolean })}
                    className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    로그인 상태 유지
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  비밀번호 찾기
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider skew-btn"
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      접속 중...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      로그인
                    </>
                  )}
                </span>
              </Button>
            </form>
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-muted-foreground">
              아직 계정이 없으신가요?{" "}
              <Link href="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                회원가입
              </Link>
            </p>
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
