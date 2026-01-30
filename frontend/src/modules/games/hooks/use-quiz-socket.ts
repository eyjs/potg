'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  QuizMatchedEvent,
  QuizRoundStartEvent,
  QuizRoundResultEvent,
  QuizMatchEndEvent,
} from '../types';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export type QuizSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface QuizGameState {
  status: 'idle' | 'matching' | 'matched' | 'playing' | 'round-result' | 'finished';
  matchId: string | null;
  opponent: {
    memberId: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  currentRound: number;
  totalRounds: number;
  currentQuestion: QuizRoundStartEvent['question'] | null;
  timeLimit: number;
  roundStartTime: number | null;
  myScore: number;
  opponentScore: number;
  lastRoundResult: QuizRoundResultEvent | null;
  finalResult: QuizMatchEndEvent | null;
  myAnswer: number | null;
  answerSubmitted: boolean;
}

const initialGameState: QuizGameState = {
  status: 'idle',
  matchId: null,
  opponent: null,
  currentRound: 0,
  totalRounds: 5,
  currentQuestion: null,
  timeLimit: 15000,
  roundStartTime: null,
  myScore: 0,
  opponentScore: 0,
  lastRoundResult: null,
  finalResult: null,
  myAnswer: null,
  answerSubmitted: false,
};

interface UseQuizSocketOptions {
  memberId: string;
  clanId: string;
  displayName: string;
  avatarUrl?: string;
  token?: string;
}

export function useQuizSocket(options: UseQuizSocketOptions) {
  const { memberId, clanId, displayName, avatarUrl, token } = options;
  const socketRef = useRef<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<QuizSocketStatus>('disconnected');
  const [gameState, setGameState] = useState<QuizGameState>(initialGameState);
  const [chatMessages, setChatMessages] = useState<Array<{
    memberId: string;
    displayName: string;
    message: string;
    timestamp: number;
  }>>([]);
  
  // 나는 player1인지 player2인지 추적
  const isPlayer1Ref = useRef<boolean>(true);

  // 소켓 연결
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setSocketStatus('connecting');

    const socket = io(`${SOCKET_URL}/quiz`, {
      transports: ['websocket'],
      auth: { token },
      query: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Quiz socket connected');
      setSocketStatus('connected');
      
      // 인증
      socket.emit('auth', {
        token,
        memberId,
        clanId,
        displayName,
        avatarUrl,
      });
    });

    socket.on('auth:success', () => {
      console.log('Quiz auth successful');
    });

    socket.on('disconnect', () => {
      console.log('Quiz socket disconnected');
      setSocketStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Quiz socket error:', error);
      setSocketStatus('error');
    });

    socket.on('error', (data: { message: string }) => {
      console.error('Quiz error:', data.message);
    });

    // 매칭 대기
    socket.on('quiz:waiting', (data: { matchId: string; message: string }) => {
      console.log('Waiting for match:', data);
      isPlayer1Ref.current = true; // 먼저 대기열에 들어간 사람이 player1
      setGameState((prev) => ({
        ...prev,
        status: 'matching',
        matchId: data.matchId,
      }));
    });

    // 매칭 성공
    socket.on('quiz:matched', (data: QuizMatchedEvent) => {
      console.log('Matched!', data);
      setGameState((prev) => ({
        ...prev,
        status: 'matched',
        matchId: data.matchId,
        opponent: data.opponent,
        totalRounds: data.totalRounds,
      }));
    });

    // 게임 시작
    socket.on('quiz:started', (data: { matchId: string; totalRounds: number }) => {
      console.log('Game started:', data);
      setGameState((prev) => ({
        ...prev,
        status: 'playing',
        totalRounds: data.totalRounds,
        currentRound: 0,
        myScore: 0,
        opponentScore: 0,
      }));
    });

    // 라운드 시작
    socket.on('quiz:round-start', (data: QuizRoundStartEvent) => {
      console.log('Round start:', data);
      setGameState((prev) => ({
        ...prev,
        status: 'playing',
        currentRound: data.round,
        currentQuestion: data.question,
        timeLimit: data.timeLimit,
        roundStartTime: Date.now(),
        myAnswer: null,
        answerSubmitted: false,
        lastRoundResult: null,
      }));
    });

    // 내 답변 접수됨
    socket.on('quiz:answer-received', (data: { round: number; answerIndex: number }) => {
      setGameState((prev) => ({
        ...prev,
        myAnswer: data.answerIndex,
        answerSubmitted: true,
      }));
    });

    // 라운드 결과
    socket.on('quiz:round-result', (data: QuizRoundResultEvent) => {
      console.log('Round result:', data);
      const isP1 = isPlayer1Ref.current;
      setGameState((prev) => ({
        ...prev,
        status: 'round-result',
        lastRoundResult: data,
        myScore: isP1 ? data.scores.player1Score : data.scores.player2Score,
        opponentScore: isP1 ? data.scores.player2Score : data.scores.player1Score,
      }));
    });

    // 게임 종료
    socket.on('quiz:match-end', (data: QuizMatchEndEvent) => {
      console.log('Match end:', data);
      const isP1 = isPlayer1Ref.current;
      setGameState((prev) => ({
        ...prev,
        status: 'finished',
        finalResult: data,
        myScore: isP1 ? data.finalScores.player1Score : data.finalScores.player2Score,
        opponentScore: isP1 ? data.finalScores.player2Score : data.finalScores.player1Score,
      }));
    });

    // 매칭 취소됨
    socket.on('quiz:cancelled', () => {
      setGameState(initialGameState);
    });

    // 채팅
    socket.on('quiz:chat', (data: {
      memberId: string;
      displayName: string;
      message: string;
      timestamp: number;
    }) => {
      setChatMessages((prev) => [...prev.slice(-49), data]);
    });

    return socket;
  }, [memberId, clanId, displayName, avatarUrl, token]);

  // 연결 해제
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketStatus('disconnected');
    setGameState(initialGameState);
    setChatMessages([]);
  }, []);

  // 매칭 시작
  const findMatch = useCallback((totalRounds: number = 5) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }

    socketRef.current.emit('quiz:find-match', { clanId, totalRounds });
    setGameState((prev) => ({ ...prev, status: 'matching' }));
  }, [clanId]);

  // 매칭 취소
  const cancelMatch = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('quiz:cancel-match');
    setGameState(initialGameState);
  }, []);

  // 답변 제출
  const submitAnswer = useCallback((answerIndex: number) => {
    if (!socketRef.current?.connected || !gameState.matchId) return;
    if (gameState.answerSubmitted) return;

    const timeMs = gameState.roundStartTime
      ? Date.now() - gameState.roundStartTime
      : 0;

    socketRef.current.emit('quiz:answer', {
      matchId: gameState.matchId,
      round: gameState.currentRound,
      answerIndex,
      timeMs,
    });
  }, [gameState.matchId, gameState.currentRound, gameState.roundStartTime, gameState.answerSubmitted]);

  // 채팅 전송
  const sendChat = useCallback((message: string) => {
    if (!socketRef.current?.connected || !gameState.matchId) return;
    socketRef.current.emit('quiz:chat', {
      matchId: gameState.matchId,
      message,
    });
  }, [gameState.matchId]);

  // 상태 리셋
  const resetGame = useCallback(() => {
    setGameState(initialGameState);
    setChatMessages([]);
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socketStatus,
    gameState,
    chatMessages,
    isPlayer1: isPlayer1Ref.current,
    connect,
    disconnect,
    findMatch,
    cancelMatch,
    submitAnswer,
    sendChat,
    resetGame,
  };
}
