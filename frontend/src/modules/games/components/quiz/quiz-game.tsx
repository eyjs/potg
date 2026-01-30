'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/common/components/ui/button';
import { Card, CardContent } from '@/common/components/ui/card';
import { Badge } from '@/common/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar';
import { Progress } from '@/common/components/ui/progress';
import { CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import type { QuizGameState } from '../../hooks/use-quiz-socket';
import { QuizDifficulty } from '../../types';
import { cn } from '@/lib/utils';

interface QuizGameProps {
  gameState: QuizGameState;
  myDisplayName: string;
  myAvatarUrl?: string;
  onSubmitAnswer: (answerIndex: number) => void;
  isPlayer1: boolean;
}

const DIFFICULTY_COLORS: Record<QuizDifficulty, string> = {
  [QuizDifficulty.EASY]: 'bg-green-500/20 text-green-400 border-green-500/50',
  [QuizDifficulty.NORMAL]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  [QuizDifficulty.HARD]: 'bg-red-500/20 text-red-400 border-red-500/50',
};

const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  [QuizDifficulty.EASY]: '쉬움',
  [QuizDifficulty.NORMAL]: '보통',
  [QuizDifficulty.HARD]: '어려움',
};

export function QuizGame({
  gameState,
  myDisplayName,
  myAvatarUrl,
  onSubmitAnswer,
  isPlayer1,
}: QuizGameProps) {
  const [timeLeft, setTimeLeft] = useState(gameState.timeLimit);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const {
    currentRound,
    totalRounds,
    currentQuestion,
    timeLimit,
    roundStartTime,
    myScore,
    opponentScore,
    lastRoundResult,
    answerSubmitted,
    opponent,
    status,
  } = gameState;

  // 타이머
  useEffect(() => {
    if (status !== 'playing' || !roundStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - roundStartTime;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [status, roundStartTime, timeLimit]);

  // 라운드 변경 시 리셋
  useEffect(() => {
    setSelectedAnswer(null);
    setTimeLeft(timeLimit);
  }, [currentRound, timeLimit]);

  const handleSelectAnswer = useCallback((index: number) => {
    if (answerSubmitted || status === 'round-result') return;
    setSelectedAnswer(index);
    onSubmitAnswer(index);
  }, [answerSubmitted, status, onSubmitAnswer]);

  const progressPercent = (timeLeft / timeLimit) * 100;
  const isTimeWarning = progressPercent < 33;

  // 라운드 결과 표시
  if (status === 'round-result' && lastRoundResult) {
    const myResult = isPlayer1 ? lastRoundResult.player1 : lastRoundResult.player2;
    const opponentResult = isPlayer1 ? lastRoundResult.player2 : lastRoundResult.player1;
    const correctIndex = lastRoundResult.correctIndex;

    return (
      <div className="space-y-6">
        {/* 스코어보드 */}
        <ScoreBoard
          myDisplayName={myDisplayName}
          myAvatarUrl={myAvatarUrl}
          myScore={myScore}
          opponentDisplayName={opponent?.displayName || '상대방'}
          opponentAvatarUrl={opponent?.avatarUrl || null}
          opponentScore={opponentScore}
          currentRound={currentRound}
          totalRounds={totalRounds}
        />

        {/* 결과 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-8 text-center space-y-6">
            <div className="text-xl font-bold">
              {currentRound}라운드 결과
            </div>

            {/* 정답 */}
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-zinc-400 text-sm mb-2">정답</p>
              <p className="text-lg font-semibold text-green-400">
                {currentQuestion?.options[correctIndex]}
              </p>
            </div>

            {/* 양 플레이어 결과 */}
            <div className="flex justify-center gap-8">
              <ResultCard
                name={myDisplayName}
                avatarUrl={myAvatarUrl}
                answer={myResult.answer}
                correct={myResult.correct}
                time={myResult.time}
                points={myResult.pointsGained}
                options={currentQuestion?.options || []}
                isMe
              />
              <ResultCard
                name={opponent?.displayName || '상대방'}
                avatarUrl={opponent?.avatarUrl || null}
                answer={opponentResult.answer}
                correct={opponentResult.correct}
                time={opponentResult.time}
                points={opponentResult.pointsGained}
                options={currentQuestion?.options || []}
              />
            </div>

            <p className="text-zinc-500 text-sm">
              다음 문제 준비 중...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 게임 진행 중
  return (
    <div className="space-y-4">
      {/* 스코어보드 */}
      <ScoreBoard
        myDisplayName={myDisplayName}
        myAvatarUrl={myAvatarUrl}
        myScore={myScore}
        opponentDisplayName={opponent?.displayName || '상대방'}
        opponentAvatarUrl={opponent?.avatarUrl || null}
        opponentScore={opponentScore}
        currentRound={currentRound}
        totalRounds={totalRounds}
      />

      {/* 타이머 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={cn(
            'flex items-center gap-1 font-mono',
            isTimeWarning ? 'text-red-400' : 'text-zinc-400'
          )}>
            <Clock className="w-4 h-4" />
            {(timeLeft / 1000).toFixed(1)}초
          </span>
          {answerSubmitted && (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              답변 완료
            </span>
          )}
        </div>
        <Progress
          value={progressPercent}
          className={cn(
            'h-2',
            isTimeWarning && '[&>div]:bg-red-500'
          )}
        />
      </div>

      {/* 문제 */}
      {currentQuestion && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-6 space-y-6">
            {/* 문제 헤더 */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={DIFFICULTY_COLORS[currentQuestion.difficulty]}
              >
                {DIFFICULTY_LABELS[currentQuestion.difficulty]}
              </Badge>
              <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                {currentQuestion.category}
              </Badge>
            </div>

            {/* 문제 텍스트 */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white leading-relaxed">
                {currentQuestion.question}
              </h2>
              {currentQuestion.imageUrl && (
                <img
                  src={currentQuestion.imageUrl}
                  alt="문제 이미지"
                  className="mt-4 mx-auto max-w-full max-h-48 rounded-lg"
                />
              )}
            </div>

            {/* 선택지 */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={cn(
                    'h-auto py-4 px-6 text-left justify-start text-base',
                    'border-zinc-700 hover:border-orange-500 hover:bg-orange-500/10',
                    selectedAnswer === index && 'border-orange-500 bg-orange-500/20',
                    answerSubmitted && 'cursor-not-allowed opacity-70'
                  )}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={answerSubmitted}
                >
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold',
                    'bg-zinc-800',
                    selectedAnswer === index && 'bg-orange-500 text-white'
                  )}>
                    {index + 1}
                  </span>
                  {option}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 스코어보드 컴포넌트
function ScoreBoard({
  myDisplayName,
  myAvatarUrl,
  myScore,
  opponentDisplayName,
  opponentAvatarUrl,
  opponentScore,
  currentRound,
  totalRounds,
}: {
  myDisplayName: string;
  myAvatarUrl?: string;
  myScore: number;
  opponentDisplayName: string;
  opponentAvatarUrl: string | null;
  opponentScore: number;
  currentRound: number;
  totalRounds: number;
}) {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          {/* 나 */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-blue-500">
              <AvatarImage src={myAvatarUrl} />
              <AvatarFallback>{myDisplayName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-blue-400">{myDisplayName}</p>
              <p className="text-2xl font-bold text-white">{myScore}</p>
            </div>
          </div>

          {/* 라운드 */}
          <div className="text-center">
            <p className="text-zinc-500 text-sm">라운드</p>
            <p className="text-lg font-bold text-orange-400">
              {currentRound} / {totalRounds}
            </p>
          </div>

          {/* 상대 */}
          <div className="flex items-center gap-3 flex-row-reverse">
            <Avatar className="w-10 h-10 border-2 border-red-500">
              <AvatarImage src={opponentAvatarUrl || undefined} />
              <AvatarFallback>{opponentDisplayName[0]}</AvatarFallback>
            </Avatar>
            <div className="text-right">
              <p className="font-medium text-red-400">{opponentDisplayName}</p>
              <p className="text-2xl font-bold text-white">{opponentScore}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 결과 카드 컴포넌트
function ResultCard({
  name,
  avatarUrl,
  answer,
  correct,
  time,
  points,
  options,
  isMe = false,
}: {
  name: string;
  avatarUrl?: string | null;
  answer: number | null;
  correct: boolean;
  time: number | null;
  points: number;
  options: string[];
  isMe?: boolean;
}) {
  return (
    <div className={cn(
      'text-center p-4 rounded-lg',
      isMe ? 'bg-blue-500/10' : 'bg-red-500/10'
    )}>
      <Avatar className={cn(
        'w-12 h-12 mx-auto mb-2 border-2',
        isMe ? 'border-blue-500' : 'border-red-500'
      )}>
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <p className={cn(
        'font-medium mb-2',
        isMe ? 'text-blue-400' : 'text-red-400'
      )}>
        {name}
      </p>

      {answer !== null ? (
        <div className="space-y-1">
          <div className={cn(
            'flex items-center justify-center gap-1',
            correct ? 'text-green-400' : 'text-red-400'
          )}>
            {correct ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">
              {correct ? '정답!' : '오답'}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            선택: {options[answer]}
          </p>
          {time !== null && (
            <p className="text-xs text-zinc-500">
              {(time / 1000).toFixed(2)}초
            </p>
          )}
          {points > 0 && (
            <p className="text-green-400 font-semibold flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" />
              +{points}점
            </p>
          )}
        </div>
      ) : (
        <p className="text-zinc-500">시간 초과</p>
      )}
    </div>
  );
}
