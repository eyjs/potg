"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Gavel,
  BarChart3,
  Wallet,
  Menu,
  X,
  ShoppingBag,
  Users,
  Wrench,
  Settings,
  LogOut,
  Dices,
  User,
  Heart
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/common/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"

export function BottomNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (!user) return null

  const mainItems = [
    { href: "/", label: "홈", icon: Home },
    { href: "/vote", label: "통계", icon: BarChart3 },
    { href: "/auction", label: "경매", icon: Gavel },
    { href: "/wallet", label: "지갑", icon: Wallet },
  ]

  const menuItems = [
    { href: "/betting", label: "베팅", icon: Dices },
    { href: "/shop", label: "상점", icon: ShoppingBag },
    { href: "/utility", label: "유틸리티", icon: Wrench },
    { href: "/gallery", label: "소개팅", icon: Heart },
    { href: "/clan/manage", label: "클랜 관리", icon: Settings },
    { href: "/my-info", label: "내 정보", icon: User },
  ]

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0B]/95 backdrop-blur-md border-t border-border/40 pb-safe">
        <div className="flex justify-around items-center h-16">
          {mainItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center h-full gap-1 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "fill-current")} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{item.label}</span>
                </div>
              </Link>
            )
          })}
          
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex-1 flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">메뉴</span>
          </button>
        </div>
      </nav>

      {/* Expanded Menu (Hamburger Content) */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl animate-in slide-in-from-bottom-full">
          <div className="flex flex-col h-full p-6 pb-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">메뉴</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {user.battleTag?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-lg font-bold text-primary">{user.battleTag}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user.mainRole || "Flex"}</p>
                </div>
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-3 gap-3">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                      <div
                        className={cn(
                          "p-4 rounded-lg border flex flex-col items-center gap-2 transition-colors",
                          isActive
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-card border-border hover:bg-muted/50"
                        )}
                      >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Clan Quick Actions */}
              {!user.clanId && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">클랜</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/clan/create" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full h-12">
                        클랜 생성
                      </Button>
                    </Link>
                    <Link href="/clan/join" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full h-12 bg-primary text-primary-foreground">
                        클랜 가입
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Logout */}
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  logout()
                  setIsMenuOpen(false)
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
