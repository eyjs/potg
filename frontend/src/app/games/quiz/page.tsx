'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/common/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useQuizSocket } from '@/modules/games/hooks/use-quiz-socket';
import { QuizLobby } from '@/modules/games/components/quiz/quiz-lobby';
import { QuizGame } from '@/modules/games/components/quiz/quiz-game';
import { QuizResult } from '@/modules/games/components/quiz/quiz-result';
import Link from 'next/link';

export default function QuizBattlePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const memberId = user?.id || ''; // 실제로는 clanMember.id가 필요
  const clanId = user?.clanId || '';
  const displayName = user?.battleTag || user?.username || 'Player';
  const avatarUrl = user?.avatarUrl;

  const {
    socketStatus,
    gameState,
    chatMessages,
    isPlayer1,
    connect,
    disconnect,
    findMatch,
    cancelMatch,
    submitAnswer,
    sendChat,
    resetGame,
  } = useQuizSocket({
    memberId,
    clanId,
    displayName,
    avatarUrl,
    token: typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '',
  });

  // 비로그인 유저 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // 클랜 미가입 유저 처리
  if (!authLoading && user && !user.clanId) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <h1 className="text-xl font-semibold text-white mb-4">
            클랜 가입이 필요합니다
          </h1>
          <p className="text-zinc-400 mb-6">
            퀴즈 배틀은 클랜원들만 참여할 수 있습니다.
          </p>
          <Button asChild>
            <Link href="/clan">클랜 둘러보기</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handlePlayAgain = () => {
    resetGame();
  };

  const renderContent = () => {
    const { status } = gameState;

    // 게임 종료
    if (status === 'finished') {
      return (
        <QuizResult
          gameState={gameState}
          myMemberId={memberId}
          myDisplayName={displayName}
          myAvatarUrl={avatarUrl}
          onPlayAgain={handlePlayAgain}
          isPlayer1={isPlayer1}
        />
      );
    }

    // 게임 진행 중 또는 라운드 결과
    if (status === 'playing' || status === 'round-result') {
      return (
        <QuizGame
          gameState={gameState}
          myDisplayName={displayName}
          myAvatarUrl={avatarUrl}
          onSubmitAnswer={submitAnswer}
          isPlayer1={isPlayer1}
        />
      );
    }

    // 로비 (매칭 대기 포함)
    return (
      <QuizLobby
        socketStatus={socketStatus}
        gameState={gameState}
        onConnect={connect}
        onFindMatch={findMatch}
        onCancelMatch={cancelMatch}
      />
    );
  };

  if (authLoading) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-64 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="shrink-0"
        >
          <Link href="/games">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">
            오버워치 퀴즈 배틀
          </h1>
          <p className="text-sm text-zinc-400">
            1:1 실시간 퀴즈 대결
          </p>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      {renderContent()}
    </div>
  );
}
