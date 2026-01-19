"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, UserPlus, Shield, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const RANK_OPTIONS = [
  { value: "bronze", label: "브론즈" },
  { value: "silver", label: "실버" },
  { value: "gold", label: "골드" },
  { value: "platinum", label: "플래티넘" },
  { value: "diamond", label: "다이아몬드" },
  { value: "master", label: "마스터" },
  { value: "grandmaster", label: "그랜드마스터" },
  { value: "champion", label: "챔피언" },
]

const ROLE_OPTIONS = [
  { value: "tank", label: "탱커", icon: "🛡️" },
  { value: "damage", label: "딜러", icon: "⚔️" },
  { value: "support", label: "서포터", icon: "💚" },
  { value: "flex", label: "플렉스", icon: "🔄" },
]

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: 기본정보, 2: 게임정보
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    battleTag: "",
    rank: "",
    mainRole: "",
    agreeTerms: false,
    agreePrivacy: false,
  })

  // Password validation
  const passwordChecks = {
    length: formData.password.length >= 8,
    hasNumber: /\d/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
    match: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0,
  }

  const isStep1Valid = formData.email && passwordChecks.length && passwordChecks.hasNumber && passwordChecks.match
  const isStep2Valid =
    formData.nickname &&
    formData.battleTag &&
    formData.rank &&
    formData.mainRole &&
    formData.agreeTerms &&
    formData.agreePrivacy

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
      return
    }
    setIsLoading(true)
    // TODO: 실제 회원가입 API 호출
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    router.push("/login?registered=true")
  }

  const PasswordCheck = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? "text-green-500" : "text-muted-foreground"}`}>
      {valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  )

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
            <span className="text-primary-foreground font-extrabold text-lg italic">J</span>
          </div>
          <span className="font-extrabold text-xl italic tracking-wider text-foreground">
            JOONBI <span className="text-primary">HQ</span>
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold italic uppercase tracking-wider text-foreground mb-2">회원가입</h1>
            <p className="text-muted-foreground">JoonBi HQ의 멤버가 되어보세요</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <span className={`text-sm font-medium ${step >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
                기본정보
              </span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className={`text-sm font-medium ${step >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
                게임정보
              </span>
            </div>
          </div>

          {/* Signup Form Card */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 p-6 relative overflow-hidden">
            {/* Accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-accent" />

            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 ? (
                <>
                  {/* Step 1: Basic Info */}
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
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    {/* Password Requirements */}
                    <div className="space-y-1 pt-1">
                      <PasswordCheck valid={passwordChecks.length} label="8자 이상" />
                      <PasswordCheck valid={passwordChecks.hasNumber} label="숫자 포함" />
                      <PasswordCheck valid={passwordChecks.hasSpecial} label="특수문자 포함 (선택)" />
                    </div>
                  </div>

                  {/* Confirm Password */}
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
                        placeholder="••••••••"
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
                </>
              ) : (
                <>
                  {/* Step 2: Game Info */}
                  {/* Nickname */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="nickname"
                      className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      닉네임
                    </Label>
                    <Input
                      id="nickname"
                      type="text"
                      placeholder="JoonBi에서 사용할 닉네임"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      required
                      className="bg-[#1a1a1a] border-border/50 focus:border-primary h-12 text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>

                  {/* Battle Tag */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="battleTag"
                      className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      배틀태그
                    </Label>
                    <Input
                      id="battleTag"
                      type="text"
                      placeholder="Player#1234"
                      value={formData.battleTag}
                      onChange={(e) => setFormData({ ...formData, battleTag: e.target.value })}
                      required
                      className="bg-[#1a1a1a] border-border/50 focus:border-primary h-12 text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>

                  {/* Rank & Role */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        최고 티어
                      </Label>
                      <Select
                        value={formData.rank}
                        onValueChange={(value) => setFormData({ ...formData, rank: value })}
                      >
                        <SelectTrigger className="bg-[#1a1a1a] border-border/50 h-12 text-foreground">
                          <SelectValue placeholder="티어 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {RANK_OPTIONS.map((rank) => (
                            <SelectItem key={rank.value} value={rank.value}>
                              {rank.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        주 포지션
                      </Label>
                      <Select
                        value={formData.mainRole}
                        onValueChange={(value) => setFormData({ ...formData, mainRole: value })}
                      >
                        <SelectTrigger className="bg-[#1a1a1a] border-border/50 h-12 text-foreground">
                          <SelectValue placeholder="포지션 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.icon} {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) => setFormData({ ...formData, agreeTerms: checked as boolean })}
                        className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                      />
                      <Label
                        htmlFor="agreeTerms"
                        className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                      >
                        <span className="text-primary">[필수]</span> 이용약관에 동의합니다
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreePrivacy"
                        checked={formData.agreePrivacy}
                        onCheckedChange={(checked) => setFormData({ ...formData, agreePrivacy: checked as boolean })}
                        className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                      />
                      <Label
                        htmlFor="agreePrivacy"
                        className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                      >
                        <span className="text-primary">[필수]</span> 개인정보 처리방침에 동의합니다
                      </Label>
                    </div>
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-2">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-12 border-border/50 hover:bg-muted font-semibold"
                  >
                    이전
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={step === 1 ? !isStep1Valid : !isStep2Valid || isLoading}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider skew-btn disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        가입 처리 중...
                      </>
                    ) : step === 1 ? (
                      "다음"
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        가입하기
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-1">
          <Shield className="w-4 h-4 text-primary" />
          <span>JoonBi HQ는 오버워치 팬 커뮤니티입니다</span>
        </div>
      </footer>
    </div>
  )
}
