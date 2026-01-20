"use client"

import { useState } from "react"
import Link from "next/link"
import { User, Shield, LogIn, LogOut, Coins } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu"

const navItems = [
  { href: "/", label: "대시보드" },
  { href: "/vote", label: "투표" },
  { href: "/auction", label: "경매장" },
  { href: "/betting", label: "베팅" },
  { href: "/utility", label: "유틸리티" },
  { href: "/gallery", label: "소개팅" },
]

export function Header() {
  const { user, isAdmin, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[#0B0B0B]/95 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href={user ? "/" : "/login"} className="flex items-center gap-2">
          <div className="h-10 w-10 bg-primary skew-btn flex items-center justify-center">
            <span className="text-primary-foreground font-extrabold text-lg italic">P</span>
          </div>
          <span className="font-extrabold text-xl italic tracking-wider text-foreground">
            POTG
          </span>
        </Link>

        {/* Desktop Navigation - Only show if logged in */}
        {user && (
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "skew-btn px-6 py-6 font-bold uppercase tracking-wider text-base",
                    "hover:bg-primary/20 hover:text-primary transition-all",
                  )}
                >
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* User & Admin Badge */}
        <div className="flex items-center gap-2">
          {user && isAdmin && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-destructive/20 border border-destructive/50 rounded text-xs text-destructive font-semibold">
              <Shield className="w-3 h-3" />
              ADMIN
            </div>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border min-w-[150px]">
                <Link href="/my-info">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    내 정보
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="ghost" className="skew-btn text-foreground hover:text-primary hover:bg-primary/20 gap-2">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold text-sm">로그인</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
