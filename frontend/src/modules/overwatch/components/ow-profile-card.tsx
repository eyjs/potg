"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar";
import { OverwatchProfile } from "../types";
import { RefreshCw, CheckCircle, XCircle, Clock, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { handleApiError } from "@/lib/api-error";

interface OWProfileCardProps {
  profile?: OverwatchProfile | null;
  onSync?: () => void;
  isLoading?: boolean;
}

export function OWProfileCard({ profile, onSync, isLoading }: OWProfileCardProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post("/overwatch/profile/me/sync");
      toast.success("프로필이 동기화되었습니다!");
      onSync?.();
    } catch (error) {
      handleApiError(error, "동기화 실패");
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return "동기화 안됨";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return "방금 전";
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border overflow-hidden animate-pulse">
        <div className="h-24 bg-muted/30" />
        <CardContent className="pt-0 -mt-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-muted/50" />
          <div className="mt-4 h-6 w-32 bg-muted/50 rounded" />
          <div className="mt-2 h-4 w-24 bg-muted/30 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="bg-card border-border border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-blue-500" />
            오버워치 프로필
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-4">
              오버워치 프로필이 연결되지 않았습니다.
            </p>
            <Button 
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              프로필 연동하기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* 네임카드 배경 */}
      <div 
        className="h-24 bg-gradient-to-r from-blue-500/20 to-orange-500/20 relative"
        style={profile.namecard ? {
          backgroundImage: `url(${profile.namecard})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {/* 동기화 상태 배지 */}
        <div className="absolute top-2 right-2">
          {profile.lastSyncStatus === 'success' ? (
            <Badge variant="outline" className="bg-background/80 text-green-500 border-green-500/30 text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" />
              동기화됨
            </Badge>
          ) : profile.lastSyncStatus === 'error' ? (
            <Badge variant="outline" className="bg-background/80 text-red-500 border-red-500/30 text-[10px]">
              <XCircle className="w-3 h-3 mr-1" />
              오류
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-background/80 text-muted-foreground border-border text-[10px]">
              <Clock className="w-3 h-3 mr-1" />
              대기중
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="pt-0 -mt-10 flex flex-col items-center">
        {/* 아바타 */}
        <Avatar className="w-20 h-20 border-4 border-[#0B0B0B] shadow-xl">
          <AvatarImage src={profile.avatar} />
          <AvatarFallback className="bg-blue-500 text-white text-xl font-bold">
            {profile.battleTag?.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        {/* 배틀태그 */}
        <h2 className="mt-3 text-lg font-black italic text-foreground uppercase">
          {profile.battleTag}
        </h2>
        
        {/* 칭호 */}
        {profile.title && (
          <p className="text-primary text-xs font-medium">{profile.title}</p>
        )}
        
        {/* 추천 레벨 */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1 px-3 py-1 bg-muted/30 rounded-full border border-border/50">
            <span className="text-sm font-bold text-foreground">
              추천 Lv.{profile.endorsementLevel}
            </span>
          </div>
        </div>
        
        {/* 마지막 동기화 시간 */}
        <p className="text-[10px] text-muted-foreground mt-3">
          마지막 동기화: {formatLastSync(profile.lastSyncedAt)}
        </p>
        
        {/* 동기화 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="mt-3 w-full font-bold border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          프로필 새로고침
        </Button>
      </CardContent>
    </Card>
  );
}
