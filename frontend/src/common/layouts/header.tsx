"use client"

import Link from "next/link"
import { Menu, Shield, LogIn, LogOut, Wrench, LayoutDashboard, Gavel } from "lucide-react"
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
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/auction", label: "경매", icon: Gavel },
  { href: "/admin", label: "운영", icon: Shield },
  { href: "/utility", label: "유틸리티", icon: Wrench },
]

export function Header() {
  const { user, isAdmin, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href={user ? "/" : "/login"} className="flex items-center gap-2">
          <div className="h-10 w-10 bg-primary skew-btn flex items-center justify-center">
            <span className="text-primary-foreground font-extrabold text-lg italic">P</span>
          </div>
          <span className="font-extrabold text-xl italic tracking-wider text-foreground">
            POTG
          </span>
        </Link>

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
                  <span className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Button>
              </Link>
            ))}
          </nav>
        )}

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
                  <Menu className="w-6 h-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border min-w-[150px]">
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={logout}
                >
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
