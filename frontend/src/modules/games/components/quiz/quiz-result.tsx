'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Coins, Home, RotateCcw } from 'lucide-react';
import type { QuizGameState } from '../../hooks/use-quiz-socket';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect } from 'react';

interface QuizResultProps {
  gameState: QuizGameState;
  myMemberId: string;
  myDisplayName: string;
  myAvatarUrl?: string;
  onPlayAgain: () => void;
  isPlayer1: boolean;
}

export function QuizResult({
  gameState,
  myMemberId,
  myDisplayName,
  myAvatarUrl,
  onPlayAgain,
  isPlayer1,
}: QuizResultProps) {
  const { myScore, opponentScore, opponent, finalResult } = gameState;

  const isWinner = finalResult?.winnerId === myMemberId ||
    (isPlayer1 && myScore > opponentScore) ||
    (!isPlayer1 && opponentScore < myScore);
  const isDraw = !finalResult?.winnerId && myScore === opponentScore;

  // 승리 시 효과 (canvas-confetti 설치 시 활성화 가능)
  useEffect(() => {
    if (isWinner) {
      // 승리 축하 효과
      console.log('🎉 Victory!');
    }
  }, [isWinner]);

  const getResultMessage = () => {
    if (isDraw) return '무승부!';
    if (isWinner) return '승리!';
    return '패배...';
  };

  const getResultColor = () => {
    if (isDraw) return 'text-yellow-400';
    if (isWinner) return 'text-green-400';
    return 'text-red-400';
  };

  const getResultIcon = () => {
    if (isDraw) return <Medal className="w-16 h-16 text-yellow-400" />;
    if (isWinner) return <Trophy className="w-16 h-16 text-yellow-400" />;
    return <Medal className="w-16 h-16 text-zinc-500" />;
  };

  return (
    <div className="space-y-6">
      {/* 결과 헤더 */}
      <Card className={cn(
        'border-2',
        isDraw && 'bg-yellow-500/10 border-yellow-500/50',
        isWinner && 'bg-green-500/10 border-green-500/50',
        !isDraw && !isWinner && 'bg-red-500/10 border-red-500/50'
      )}>
        <CardContent className="py-8 text-center">
          <div className="mb-4">
            {getResultIcon()}
          </div>
          <h1 className={cn('text-4xl font-bold mb-2', getResultColor())}>
            {getResultMessage()}
          </h1>
          <p className="text-zinc-400">
            퀴즈 배틀이 종료되었습니다
          </p>
        </CardContent>
      </Card>

      {/* 최종 스코어 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-6">
          <h2 className="text-center text-lg font-semibold text-white mb-6">
            최종 점수
          </h2>
          <div className="flex items-center justify-center gap-8">
            {/* 나 */}
            <div className={cn(
              'text-center p-4 rounded-xl',
              isWinner && 'bg-green-500/10 ring-2 ring-green-500/50'
            )}>
              <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-blue-500">
                <AvatarImage src={myAvatarUrl} />
                <AvatarFallback>{myDisplayName[0]}</AvatarFallback>
              </Avatar>
              <p className="font-medium text-blue-400 mb-1">{myDisplayName}</p>
              <p className="text-3xl font-bold text-white">{myScore}</p>
              {isWinner && (
                <div className="mt-2 flex items-center justify-center gap-1 text-green-400">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">승리</span>
                </div>
              )}
            </div>

            <div className="text-3xl font-bold text-zinc-600">VS</div>

            {/* 상대 */}
            <div className={cn(
              'text-center p-4 rounded-xl',
              !isWinner && !isDraw && 'bg-green-500/10 ring-2 ring-green-500/50'
            )}>
              <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-red-500">
                <AvatarImage src={opponent?.avatarUrl || undefined} />
                <AvatarFallback>
                  {opponent?.displayName?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium text-red-400 mb-1">
                {opponent?.displayName || '상대방'}
              </p>
              <p className="text-3xl font-bold text-white">{opponentScore}</p>
              {!isWinner && !isDraw && (
                <div className="mt-2 flex items-center justify-center gap-1 text-green-400">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">승리</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 보상 */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            <Coins className="w-6 h-6 text-yellow-400" />
            <span className="text-lg font-semibold text-white">
              {finalResult?.pointsEarned || (isWinner ? 30 : isDraw ? 15 : 10)} 포인트 획득!
            </span>
          </div>
          <p className="text-center text-sm text-zinc-400 mt-1">
            {isWinner ? '승리 보너스 포함' : isDraw ? '무승부 보너스 포함' : '참가 보상'}
          </p>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          asChild
        >
          <Link href="/games">
            <Home className="w-4 h-4 mr-2" />
            게임 목록
          </Link>
        </Button>
        <Button
          className={cn(
            'flex-1',
            'bg-gradient-to-r from-orange-500 to-red-500',
            'hover:from-orange-600 hover:to-red-600'
          )}
          onClick={onPlayAgain}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          다시 플레이
        </Button>
      </div>
    </div>
  );
}
