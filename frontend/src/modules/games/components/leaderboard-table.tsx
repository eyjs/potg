'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Clock } from 'lucide-react';
import type { LeaderboardEntry } from '../types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  showTime?: boolean;
  currentMemberId?: string;
}

const RANK_STYLE: Record<number, { icon: React.ReactNode; color: string }> = {
  1: { icon: <Trophy className="w-5 h-5" />, color: 'text-yellow-400' },
  2: { icon: <Medal className="w-5 h-5" />, color: 'text-zinc-300' },
  3: { icon: <Award className="w-5 h-5" />, color: 'text-amber-600' },
};

export function LeaderboardTable({
  entries,
  showTime = false,
  currentMemberId,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        아직 기록이 없습니다. 첫 번째 도전자가 되어보세요! 🎮
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const rankStyle = RANK_STYLE[entry.rank];
        const isMe = entry.score.memberId === currentMemberId;

        return (
          <div
            key={entry.score.id}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              isMe
                ? 'bg-orange-500/10 border border-orange-500/30'
                : 'bg-zinc-900/50 hover:bg-zinc-800/50'
            }`}
          >
            {/* 순위 */}
            <div className={`w-10 text-center font-bold ${rankStyle?.color || 'text-zinc-400'}`}>
              {rankStyle?.icon || entry.rank}
            </div>

            {/* 프로필 */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {entry.member.avatarUrl ? (
                <Image
                  src={entry.member.avatarUrl}
                  alt={entry.member.battleTag}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {entry.member.battleTag.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* 이름 */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">
                {entry.member.battleTag}
                {isMe && (
                  <Badge className="ml-2 text-xs bg-orange-500/20 text-orange-400">
                    나
                  </Badge>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(entry.score.createdAt).toLocaleDateString('ko-KR')}
              </div>
            </div>

            {/* 시간 (반응속도 등) */}
            {showTime && entry.score.time !== null && (
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{entry.score.time}ms</span>
              </div>
            )}

            {/* 점수 */}
            <div className="text-right">
              <div className={`text-xl font-bold ${
                entry.rank <= 3 ? 'text-orange-400' : 'text-white'
              }`}>
                {entry.score.score.toLocaleString()}
              </div>
              {entry.score.pointsEarned > 0 && (
                <div className="text-xs text-amber-400">
                  +{entry.score.pointsEarned}P
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
