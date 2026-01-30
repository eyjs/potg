'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/common/components/ui/tabs';
import { Skeleton } from '@/common/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/components/ui/select';
import { Trophy, Calendar, Clock } from 'lucide-react';
import { LeaderboardTable } from '@/modules/games/components/leaderboard-table';
import type { LeaderboardEntry, Game, GameType } from '@/modules/games/types';
import { useClan } from '@/contexts/ClanContext';

// Mock 데이터
const MOCK_GAMES = [
  { code: 'AIM_TRAINER', name: '🎯 에임 트레이너' },
  { code: 'REACTION', name: '⚡ 반응속도' },
  { code: 'QUIZ_BATTLE', name: '🧠 퀴즈 배틀' },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    score: {
      id: '1',
      gameId: '1',
      memberId: 'm1',
      clanId: 'c1',
      score: 9850,
      time: 234,
      metadata: { accuracy: 98.5 },
      pointsEarned: 100,
      createdAt: new Date().toISOString(),
    },
    member: { battleTag: '겐지장인#1234', avatarUrl: null },
  },
  {
    rank: 2,
    score: {
      id: '2',
      gameId: '1',
      memberId: 'm2',
      clanId: 'c1',
      score: 9420,
      time: 256,
      metadata: { accuracy: 94.2 },
      pointsEarned: 50,
      createdAt: new Date().toISOString(),
    },
    member: { battleTag: '트레이서#5678', avatarUrl: null },
  },
  {
    rank: 3,
    score: {
      id: '3',
      gameId: '1',
      memberId: 'm3',
      clanId: 'c1',
      score: 8970,
      time: 278,
      metadata: { accuracy: 89.7 },
      pointsEarned: 30,
      createdAt: new Date().toISOString(),
    },
    member: { battleTag: '아나주의자#9999', avatarUrl: null },
  },
  {
    rank: 4,
    score: {
      id: '4',
      gameId: '1',
      memberId: 'm4',
      clanId: 'c1',
      score: 8540,
      time: 298,
      metadata: { accuracy: 85.4 },
      pointsEarned: 20,
      createdAt: new Date().toISOString(),
    },
    member: { battleTag: '힐러전문#1111', avatarUrl: null },
  },
  {
    rank: 5,
    score: {
      id: '5',
      gameId: '1',
      memberId: 'm5',
      clanId: 'c1',
      score: 8210,
      time: 312,
      metadata: { accuracy: 82.1 },
      pointsEarned: 10,
      createdAt: new Date().toISOString(),
    },
    member: { battleTag: '탱커왕#2222', avatarUrl: null },
  },
];

type Period = 'all' | 'daily' | 'weekly' | 'monthly';

const PERIODS: { value: Period; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '전체', icon: <Trophy className="w-4 h-4" /> },
  { value: 'daily', label: '오늘', icon: <Calendar className="w-4 h-4" /> },
  { value: 'weekly', label: '이번 주', icon: <Clock className="w-4 h-4" /> },
  { value: 'monthly', label: '이번 달', icon: <Calendar className="w-4 h-4" /> },
];

export default function LeaderboardPage() {
  const { clanId } = useClan();
  const [gameCode, setGameCode] = useState('AIM_TRAINER');
  const [period, setPeriod] = useState<Period>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [gameCode, period, clanId]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      // TODO: 실제 API 호출
      // const res = await apiClient.get(`/games/${gameCode}/leaderboard?clanId=${clanId}&period=${period}`);

      await new Promise((r) => setTimeout(r, 500));
      setEntries(MOCK_LEADERBOARD);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const showTime = gameCode === 'REACTION';

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          게임 랭킹
        </h1>
        <p className="text-zinc-400 mt-1">
          클랜 최고의 게이머는 누구?
        </p>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={gameCode} onValueChange={setGameCode}>
          <SelectTrigger className="w-full sm:w-[200px] bg-zinc-900 border-zinc-700">
            <SelectValue placeholder="게임 선택" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_GAMES.map((game) => (
              <SelectItem key={game.code} value={game.code}>
                {game.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="flex-1">
          <TabsList className="w-full bg-zinc-900 border border-zinc-800">
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="flex-1 flex items-center gap-1">
                {p.icon}
                <span className="hidden sm:inline">{p.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 리더보드 */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <LeaderboardTable
            entries={entries}
            showTime={showTime}
            currentMemberId={undefined} // TODO: 실제 memberId
          />
        )}
      </div>

      {/* 안내 */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
        <h3 className="font-semibold text-white mb-2">🏆 랭킹 보상</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• 🥇 1위: 100P + 특별 프레임</li>
          <li>• 🥈 2위: 50P</li>
          <li>• 🥉 3위: 30P</li>
          <li>• 순위권 (4-10위): 10-20P</li>
          <li>• 주간/월간 랭킹은 매주 월요일, 매월 1일에 초기화됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
