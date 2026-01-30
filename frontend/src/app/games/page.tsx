'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/common/components/ui/tabs';
import { Skeleton } from '@/common/components/ui/skeleton';
import { Button } from '@/common/components/ui/button';
import { Gamepad2, Trophy, Users, Zap } from 'lucide-react';
import { GameCard } from '@/modules/games/components/game-card';
import type { Game, GameType } from '@/modules/games/types';
import { useClan } from '@/contexts/ClanContext';
import Link from 'next/link';

// Mock 데이터 (백엔드 API가 준비되면 교체)
const MOCK_GAMES: Game[] = [
  {
    id: '1',
    code: 'AIM_TRAINER',
    name: '에임 트레이너',
    description: '빠르게 움직이는 타겟을 클릭하세요! 정확도와 반응속도를 테스트합니다.',
    type: 'SOLO' as GameType,
    thumbnailUrl: null,
    minPlayers: 1,
    maxPlayers: 1,
    pointReward: 10,
    isActive: true,
    playCount: 1234,
  },
  {
    id: '2',
    code: 'REACTION',
    name: '반응속도 테스트',
    description: '화면이 바뀌는 순간 클릭! 당신의 반응속도는 몇 ms?',
    type: 'SOLO' as GameType,
    thumbnailUrl: null,
    minPlayers: 1,
    maxPlayers: 1,
    pointReward: 5,
    isActive: true,
    playCount: 2567,
  },
  {
    id: '3',
    code: 'QUIZ_BATTLE',
    name: '오버워치 퀴즈 배틀',
    description: '1:1 실시간 오버워치 퀴즈 대결! 누가 더 오버워치를 잘 알까?',
    type: 'PVP' as GameType,
    thumbnailUrl: null,
    minPlayers: 2,
    maxPlayers: 2,
    pointReward: 50,
    isActive: true,
    playCount: 890,
  },
  {
    id: '4',
    code: 'WORD_CHAIN',
    name: '오버체인 (끝말잇기)',
    description: '오버워치 용어로 끝말잇기! 시간 안에 단어를 찾아라.',
    type: 'PARTY' as GameType,
    thumbnailUrl: null,
    minPlayers: 2,
    maxPlayers: 8,
    pointReward: 20,
    isActive: true,
    playCount: 456,
  },
  {
    id: '5',
    code: 'LIAR',
    name: '라이어 게임',
    description: '숨어있는 라이어를 찾아라! 오버워치 테마 라이어 게임.',
    type: 'PARTY' as GameType,
    thumbnailUrl: null,
    minPlayers: 4,
    maxPlayers: 10,
    pointReward: 30,
    isActive: true,
    playCount: 321,
  },
  {
    id: '6',
    code: 'CATCH_MIND',
    name: '오버마인드 (캐치마인드)',
    description: '그림을 그리고 맞추세요! 오버워치 영웅과 스킬을 그려봐요.',
    type: 'PARTY' as GameType,
    thumbnailUrl: null,
    minPlayers: 3,
    maxPlayers: 8,
    pointReward: 25,
    isActive: true,
    playCount: 567,
  },
];

const TABS = [
  { value: 'all', label: '전체', icon: <Gamepad2 className="w-4 h-4" /> },
  { value: 'SOLO', label: '솔로', icon: <Zap className="w-4 h-4" /> },
  { value: 'PVP', label: '1:1 대전', icon: <Trophy className="w-4 h-4" /> },
  { value: 'PARTY', label: '파티', icon: <Users className="w-4 h-4" /> },
];

export default function GamesPage() {
  const { clanId } = useClan();
  const [games, setGames] = useState<Game[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, [clanId]);

  const loadGames = async () => {
    try {
      setLoading(true);
      // TODO: 실제 API 호출
      // const res = await apiClient.get('/games');

      await new Promise((r) => setTimeout(r, 500));
      setGames(MOCK_GAMES);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games.filter(
    (game) => category === 'all' || game.type === category
  );

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-purple-400" />
              게임 아케이드
            </h1>
            <p className="text-zinc-400 mt-1">
              미니게임으로 포인트를 모으고 랭킹에 도전하세요!
            </p>
          </div>
          <Link href="/games/leaderboard">
            <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/20">
              <Trophy className="w-4 h-4 mr-2" />
              통합 랭킹
            </Button>
          </Link>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="w-full bg-zinc-900 border border-zinc-800">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 flex items-center gap-2"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={category} className="mt-4">
          {filteredGames.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800">
              이 카테고리에 게임이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 안내 */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
        <h3 className="font-semibold text-white mb-2">🎮 게임 안내</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• <strong>솔로 게임</strong>: 혼자서 점수를 기록하고 랭킹에 도전</li>
          <li>• <strong>1:1 대전</strong>: 다른 클랜원과 실시간 대결</li>
          <li>• <strong>파티 게임</strong>: 여러 명이 함께 즐기는 게임</li>
          <li>• 게임 결과에 따라 포인트를 획득할 수 있어요!</li>
        </ul>
      </div>
    </div>
  );
}
