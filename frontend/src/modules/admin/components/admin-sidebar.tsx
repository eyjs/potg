'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Swords,
  Users,
  ShoppingBag,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Settings,
  Gavel,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { href: '/admin', label: '대시보드', icon: <LayoutDashboard className="size-4" /> },
  { href: '/admin/matches', label: '내전 관리', icon: <Swords className="size-4" /> },
  { href: '/admin/members', label: '회원 관리', icon: <Users className="size-4" /> },
  { href: '/admin/products', label: '상품 관리', icon: <ShoppingBag className="size-4" /> },
  { href: '/admin/orders', label: '주문 관리', icon: <ClipboardList className="size-4" /> },
  { href: '/admin/auctions', label: '경매 이력', icon: <Gavel className="size-4" /> },
  { href: '/admin/attendance', label: '출석 업로드', icon: <CalendarCheck className="size-4" /> },
  { href: '/admin/ledger', label: '포인트 원장', icon: <BookOpen className="size-4" /> },
  { href: '/admin/config', label: '시스템 설정', icon: <Settings className="size-4" /> },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-60 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="skew-x-[-8deg] bg-primary px-3 py-1.5 inline-block">
          <span className="skew-x-[8deg] inline-block text-primary-foreground font-black text-sm uppercase italic tracking-wider">
            POTG Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1" aria-label="관리자 메뉴">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-[var(--ow-blue)] hover:bg-muted',
            )}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => logout()}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium w-full',
            'text-muted-foreground hover:text-destructive hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label="로그아웃"
        >
          <LogOut className="size-4" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
