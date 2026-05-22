"use client"

import Link from "next/link"
import { Vote, Gavel, MessageCircle } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent } from "@/common/components/ui/card"
import { cn } from "@/lib/utils"

interface ActionCardProps {
  title: string
  count: number
  icon: React.ReactNode
  href: string
  color: "primary" | "accent" | "destructive" | "secondary"
}

const colorClasses = {
  primary: "border-primary/50 bg-primary/5 hover:bg-primary/10",
  accent: "border-accent/50 bg-accent/5 hover:bg-accent/10",
  destructive: "border-destructive/50 bg-destructive/5 hover:bg-destructive/10",
  secondary: "border-secondary/50 bg-secondary/5 hover:bg-secondary/10",
}

const buttonColorClasses = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
}

function ActionCard({ title, count, icon, href, color }: ActionCardProps) {
  return (
    <Link href={href} className="block">
      <Card className={cn(
        "border-2 transition-all cursor-pointer h-full",
        colorClasses[color]
      )}>
        <CardContent className="p-6 flex flex-col items-center justify-between h-full min-h-[180px]">
          <div className="flex flex-col items-center gap-3 flex-1 justify-center">
            <div className="text-4xl opacity-80">{icon}</div>
            <div className="text-center">
              <h3 className="font-black italic uppercase tracking-tight text-foreground text-lg">
                {title}
              </h3>
              <p className="text-3xl font-black italic mt-2 text-foreground">
                {count}
              </p>
            </div>
          </div>
          <Button
            className={cn(
              "w-full mt-4 font-bold uppercase italic text-sm skew-btn",
              buttonColorClasses[color]
            )}
          >
            바로가기 →
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

function DiscordNoticeCard() {
  return (
    <Card className="border-2 border-secondary/50 bg-secondary/5 hover:bg-secondary/10 transition-all h-full">
      <CardContent className="p-6 flex flex-col items-center justify-between h-full min-h-[180px]">
        <div className="flex flex-col items-center gap-3 flex-1 justify-center">
          <div className="text-4xl opacity-80">
            <MessageCircle className="w-10 h-10 text-secondary-foreground" />
          </div>
          <div className="text-center">
            <h3 className="font-black italic uppercase tracking-tight text-foreground text-lg">
              베팅 · 상점 · 지갑
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              디스코드 봇에서 이용하세요
            </p>
          </div>
        </div>
        <div className="w-full mt-4 py-2 px-4 bg-secondary/20 border border-secondary/40 text-center text-xs font-bold text-muted-foreground uppercase italic tracking-wide">
          /베팅 · /상점 · /잔액
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickActionGridProps {
  voteCount: number
  auctionCount: number
}

export function QuickActionGrid({
  voteCount,
  auctionCount,
}: QuickActionGridProps) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground mb-4">
        빠른 <span className="text-primary">액세스</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ActionCard
          title="투표"
          count={voteCount}
          icon={<Vote className="w-10 h-10" />}
          href="/vote"
          color="primary"
        />
        <ActionCard
          title="경매"
          count={auctionCount}
          icon={<Gavel className="w-10 h-10" />}
          href="/auction"
          color="accent"
        />
        <DiscordNoticeCard />
      </div>
    </section>
  )
}
