"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { CompetitiveRank, RankInfo, RoleType, ROLE_LABELS, getDivisionColor } from "../types";
import { Trophy } from "lucide-react";

interface CompetitiveRankCardProps {
  competitive?: CompetitiveRank;
  platform?: "pc" | "console";
}

function RankDisplay({ role, rankInfo }: { role: RoleType; rankInfo?: RankInfo }) {
  if (!rankInfo) {
    return (
      <div className="flex flex-col items-center p-3 bg-muted/20 rounded-lg border border-border/50">
        <div className="w-12 h-12 bg-muted/40 rounded-full flex items-center justify-center mb-2">
          <span className="text-muted-foreground text-xs">-</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground">
          {ROLE_LABELS[role]}
        </span>
        <span className="text-xs text-muted-foreground">미배치</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-3 bg-gradient-to-b from-muted/30 to-muted/10 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
      {/* 랭크 아이콘 */}
      <div className="relative w-16 h-16 mb-2">
        {rankInfo.rank_icon && (
          <img
            src={rankInfo.rank_icon}
            alt={`${rankInfo.division} ${rankInfo.tier}`}
            className="w-full h-full object-contain"
          />
        )}
        {/* 티어 숫자 오버레이 */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center">
          <span className="text-xs font-black text-primary">{rankInfo.tier}</span>
        </div>
      </div>
      
      {/* 역할 */}
      <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
        {ROLE_LABELS[role]}
      </span>
      
      {/* 랭크 이름 */}
      <span className={`text-sm font-black italic uppercase ${getDivisionColor(rankInfo.division)}`}>
        {rankInfo.division}
      </span>
    </div>
  );
}

export function CompetitiveRankCard({ competitive, platform = "pc" }: CompetitiveRankCardProps) {
  const platformData = platform === "pc" ? competitive?.pc : competitive?.console;
  
  return (
    <Card className="bg-card border-border border-l-4 border-l-orange-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase italic flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-500" />
            경쟁전 랭크
          </div>
          {platformData?.season && (
            <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-500">
              시즌 {platformData.season}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!platformData ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            경쟁전 데이터가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <RankDisplay role="tank" rankInfo={platformData.tank} />
            <RankDisplay role="damage" rankInfo={platformData.damage} />
            <RankDisplay role="support" rankInfo={platformData.support} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
