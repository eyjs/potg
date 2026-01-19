"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, User, Shield, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "로비" },
  { href: "/auction", label: "경매장" },
  { href: "/utility", label: "유틸리티" },
  { href: "/gallery", label: "영웅 갤러리" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin] = useState(true) // TODO: 실제 권한 체크
  const [isLoggedIn] = useState(false) // TODO: 실제 로그인 상태 체크

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[#0B0B0B]/95 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <div className="h-10 w-10 bg-primary skew-btn flex items-center justify-center">
              <span className="text-primary-foreground font-extrabold text-lg italic">J</span>
            </div>
          </div>
          <span className="font-extrabold text-xl italic tracking-wider text-foreground hidden sm:block">
            JOONBI <span className="text-primary">HQ</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "skew-btn px-4 py-2 font-semibold uppercase tracking-wide text-sm",
                  "hover:bg-primary/20 hover:text-primary transition-all",
                )}
              >
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        {/* User & Admin Badge */}
        <div className="flex items-center gap-2">
          {isLoggedIn && isAdmin && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-destructive/20 border border-destructive/50 rounded text-xs text-destructive font-semibold">
              <Shield className="w-3 h-3" />
              ADMIN
            </div>
          )}

          {isLoggedIn ? (
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
              <User className="w-5 h-5" />
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="ghost" className="skew-btn text-foreground hover:text-primary hover:bg-primary/20 gap-2">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold text-sm">로그인</span>
              </Button>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border/40 bg-[#0B0B0B]">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
              <div className="px-4 py-3 border-b border-border/20 font-semibold uppercase tracking-wide text-sm hover:bg-primary/20 hover:text-primary transition-all">
                {item.label}
              </div>
            </Link>
          ))}
          {!isLoggedIn && (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <div className="px-4 py-3 border-b border-border/20 font-semibold uppercase tracking-wide text-sm hover:bg-primary/20 hover:text-primary transition-all flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                로그인
              </div>
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
