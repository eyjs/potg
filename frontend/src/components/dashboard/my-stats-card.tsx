"use client"

import Link from "next/link"
import { User, Award, Coins, Shield } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"

interface MyStatsCardProps {
  userRole: string
  userTier?: string
  points: number
  isAdmin: boolean
}

export function MyStatsCard({ userRole, userTier, points, isAdmin }: MyStatsCardProps) {
  return (
    <Card className="border-2 border-primary/30 bg-card">
      <CardHeader className="pb-3">
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          내 <span className="text-primary">정보</span>
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier Display */}
        {userTier && (
          <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm uppercase font-bold">티어</span>
            </div>
            <span className="text-primary font-black italic text-lg">{userTier}</span>
          </div>
        )}

        {/* Role Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm uppercase font-bold">역할</span>
          </div>
          <span className="text-foreground font-black italic">{userRole}</span>
        </div>

        {/* Points Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm uppercase font-bold">포인트</span>
          </div>
          <span className="text-foreground font-black italic">{points}P</span>
        </div>

        <div className="pt-2 space-y-2">
          <Link href="/my-info" className="block">
            <Button className="w-full bg-muted hover:bg-muted/80 text-foreground font-bold uppercase italic text-xs h-10 rounded-md">
              내 정보 상세
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/clan/manage" className="block">
              <Button className="w-full bg-primary hover:bg-primary/90 text-black font-bold uppercase italic text-xs h-10 rounded-md">
                클랜 관리
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
