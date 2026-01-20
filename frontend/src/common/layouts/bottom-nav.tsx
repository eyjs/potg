"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Gavel, Wrench, Users, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/common/components/ui/button"
import { useAuth } from "@/context/auth-context"

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (!user) return null

  const mainItems = [
    { href: "/", label: "로비", icon: Home },
    { href: "/auction", label: "경매장", icon: Gavel },
    { href: "/utility", label: "도구", icon: Wrench },
    { href: "/gallery", label: "영웅", icon: Users },
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
          <div className="flex flex-col h-full p-6">
            <div className="flex justify-end mb-8">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="w-8 h-8" />
              </Button>
            </div>
            
            <div className="flex-1 space-y-6">
              {/* User Info */}
              {user ? (
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-lg font-bold text-primary">{user.battleTag}</p>
                  <p className="text-sm text-muted-foreground">{user.mainRole}</p>
                </div>
              ) : (
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full text-lg h-14 bg-primary text-black font-bold skew-btn">
                    로그인
                  </Button>
                </Link>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Link href="/clan/join" onClick={() => setIsMenuOpen(false)}>
                  <div className="p-4 bg-card hover:bg-accent rounded-lg border border-border flex flex-col items-center gap-2 transition-colors">
                    <Users className="w-6 h-6" />
                    <span className="font-semibold">클랜 찾기</span>
                  </div>
                </Link>
                {/* Add more menu items here */}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
