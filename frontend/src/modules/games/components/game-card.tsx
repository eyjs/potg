'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/common/components/ui/badge';
import { Button } from '@/common/components/ui/button';
import { Users, Play, Trophy } from 'lucide-react';
import type { Game, GameType } from '../types';

interface GameCardProps {
  game: Game;
}

const TYPE_BADGE: Record<GameType, { label: string; color: string }> = {
  SOLO: { label: '솔로', color: 'bg-blue-500/20 text-blue-400' },
  PVP: { label: '1:1 대전', color: 'bg-red-500/20 text-red-400' },
  PARTY: { label: '파티', color: 'bg-purple-500/20 text-purple-400' },
};

const GAME_EMOJI: Record<string, string> = {
  AIM_TRAINER: '🎯',
  REACTION: '⚡',
  QUIZ_BATTLE: '🧠',
  WORD_CHAIN: '🔤',
  LIAR: '🤥',
  CATCH_MIND: '🎨',
  DEFAULT: '🎮',
};

export function GameCard({ game }: GameCardProps) {
  const typeBadge = TYPE_BADGE[game.type];
  const emoji = GAME_EMOJI[game.code] || GAME_EMOJI.DEFAULT;

  return (
    <Link href={`/games/${game.code.toLowerCase().replace(/_/g, '-')}`}>
      <div className="group bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
        {/* 썸네일 */}
        <div className="relative aspect-video bg-zinc-800 overflow-hidden">
          {game.thumbnailUrl ? (
            <Image
              src={game.thumbnailUrl}
              alt={game.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {emoji}
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge className={`text-xs ${typeBadge.color}`}>
              {typeBadge.label}
            </Badge>
          </div>
        </div>

        {/* 정보 */}
        <div className="p-4">
          <h3 className="font-bold text-white text-lg mb-1 group-hover:text-orange-400 transition-colors">
            {game.name}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-2 mb-3 min-h-[40px]">
            {game.description || '게임 설명이 없습니다.'}
          </p>

          {/* 통계 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              {game.maxPlayers > 1 && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <Users className="w-4 h-4" />
                  {game.minPlayers}-{game.maxPlayers}
                </span>
              )}
              <span className="flex items-center gap-1 text-zinc-500">
                <Play className="w-4 h-4" />
                {game.playCount.toLocaleString()}
              </span>
            </div>
            {game.pointReward > 0 && (
              <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                +{game.pointReward}P
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
