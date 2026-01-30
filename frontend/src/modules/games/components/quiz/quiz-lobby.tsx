'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Swords, Trophy, X } from 'lucide-react';
import type { QuizSocketStatus, QuizGameState } from '../../hooks/use-quiz-socket';
import { cn } from '@/lib/utils';

interface QuizLobbyProps {
  socketStatus: QuizSocketStatus;
  gameState: QuizGameState;
  onConnect: () => void;
  onFindMatch: (rounds: number) => void;
  onCancelMatch: () => void;
}

export function QuizLobby({
  socketStatus,
  gameState,
  onConnect,
  onFindMatch,
  onCancelMatch,
}: QuizLobbyProps) {
  const [rounds, setRounds] = useState<number>(5);
  const isConnected = socketStatus === 'connected';
  const isMatching = gameState.status === 'matching';
  const isMatched = gameState.status === 'matched';

  const handleStartMatch = () => {
    if (!isConnected) {
      onConnect();
      // 연결 후 자동으로 매칭 시작하려면 useEffect 필요
      setTimeout(() => onFindMatch(rounds), 500);
    } else {
      onFindMatch(rounds);
    }
  };

  return (
    <div className="space-y-6">
      {/* 게임 설명 */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Swords className="w-6 h-6 text-orange-400" />
            오버워치 퀴즈 배틀
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-300">
            실시간 1:1 오버워치 퀴즈 대결! 영웅, 스킬, 맵, 스토리 등 다양한 문제가 출제됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-orange-500/50">
              <Trophy className="w-3 h-3 mr-1" />
              승리 시 30P
            </Badge>
            <Badge variant="outline" className="border-zinc-500/50">
              참가 시 10P
            </Badge>
            <Badge variant="outline" className="border-blue-500/50">
              15초 제한
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 매칭 UI */}
      {isMatching || isMatched ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-8">
            <div className="flex flex-col items-center space-y-6">
              {isMatching && (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-orange-500/20 animate-ping absolute" />
                    <div className="w-20 h-20 rounded-full bg-orange-500/30 flex items-center justify-center relative">
                      <Search className="w-8 h-8 text-orange-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white">상대를 찾는 중...</h3>
                    <p className="text-zinc-400 text-sm mt-1">
                      잠시만 기다려주세요
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={onCancelMatch}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <X className="w-4 h-4 mr-2" />
                    매칭 취소
                  </Button>
                </>
              )}

              {isMatched && gameState.opponent && (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-green-400">매칭 완료!</h3>
                    <p className="text-zinc-400 text-sm mt-1">
                      곧 게임이 시작됩니다
                    </p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <Avatar className="w-16 h-16 mx-auto border-2 border-blue-500">
                        <AvatarFallback>나</AvatarFallback>
                      </Avatar>
                      <p className="mt-2 font-medium text-blue-400">나</p>
                    </div>
                    <div className="text-2xl font-bold text-zinc-500">VS</div>
                    <div className="text-center">
                      <Avatar className="w-16 h-16 mx-auto border-2 border-red-500">
                        <AvatarImage src={gameState.opponent.avatarUrl || undefined} />
                        <AvatarFallback>
                          {gameState.opponent.displayName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-2 font-medium text-red-400">
                        {gameState.opponent.displayName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    <span className="text-zinc-400">게임 시작 준비 중...</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-zinc-400 whitespace-nowrap">
                라운드 수:
              </label>
              <Select
                value={rounds.toString()}
                onValueChange={(v: string) => setRounds(parseInt(v))}
              >
                <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 라운드</SelectItem>
                  <SelectItem value="5">5 라운드</SelectItem>
                  <SelectItem value="7">7 라운드</SelectItem>
                  <SelectItem value="10">10 라운드</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className={cn(
                'w-full h-14 text-lg font-semibold',
                'bg-gradient-to-r from-orange-500 to-red-500',
                'hover:from-orange-600 hover:to-red-600',
              )}
              onClick={handleStartMatch}
              disabled={socketStatus === 'connecting'}
            >
              {socketStatus === 'connecting' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  연결 중...
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5 mr-2" />
                  대전 시작
                </>
              )}
            </Button>

            <p className="text-xs text-zinc-500 text-center">
              * 상대방이 나타날 때까지 잠시 기다릴 수 있습니다
            </p>
          </CardContent>
        </Card>
      )}

      {/* 게임 규칙 */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">게임 규칙</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-500 space-y-2">
          <p>• 각 문제는 4지선다로 출제됩니다</p>
          <p>• 정답을 맞추면 기본 100점 + 시간 보너스(최대 50점)</p>
          <p>• 15초 안에 답을 선택해야 합니다</p>
          <p>• 더 많은 점수를 획득한 플레이어가 승리!</p>
        </CardContent>
      </Card>
    </div>
  );
}
