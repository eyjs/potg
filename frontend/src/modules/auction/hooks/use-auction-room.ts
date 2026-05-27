'use client';

import { useCallback, useMemo, useState } from 'react';
import type { useAuctionSocket } from './use-auction-socket';

type AuctionSocket = ReturnType<typeof useAuctionSocket>;
type RoomState = NonNullable<AuctionSocket['roomState']>;
type Participant = RoomState['participants'][number];
type Team = RoomState['teams'][number];

type AuctionUser = {
  id: string;
  role: string;
  battleTag?: string | null;
} | null;

export type AuctionUserRole = 'admin' | 'captain' | 'spectator';

/**
 * 경매방 페이지의 derived state + 입력 컨트롤을 응집한 hook.
 *
 * - userRole / myTeam / availablePlayers 등 파생값을 한 곳에서 계산
 * - chatInput / selectedBidAmount / selectedUnsoldPlayer 같은 페이지 로컬 state
 * - handleBid / handleSendChat 콜백
 *
 * roomState 가 없는 경우 (소켓 연결 전) availablePlayers 는 빈 배열,
 * userRole 은 spectator 기본값.
 */
export function useAuctionRoom(opts: {
  user: AuctionUser;
  roomState: RoomState | null;
  placeBid: AuctionSocket['placeBid'];
  sendChatMessage: AuctionSocket['sendChatMessage'];
}) {
  const { user, roomState, placeBid, sendChatMessage } = opts;

  const [chatInput, setChatInput] = useState('');
  const [selectedBidAmount, setSelectedBidAmount] = useState(100);
  const [selectedUnsoldPlayer, setSelectedUnsoldPlayer] =
    useState<string | null>(null);

  const userRole: AuctionUserRole = useMemo(() => {
    if (
      user?.role === 'ADMIN' ||
      roomState?.auction?.creatorId === user?.id
    ) {
      return 'admin';
    }
    const myPart = roomState?.participants?.find(
      (p: Participant) => p.user?.id === user?.id,
    );
    if (myPart?.role === 'CAPTAIN') return 'captain';
    return 'spectator';
  }, [user, roomState]);

  const myTeam: Team | null = useMemo(() => {
    if (userRole !== 'captain') return null;
    return (
      roomState?.teams?.find((t: Team) => t.captainId === user?.id) ?? null
    );
  }, [userRole, roomState, user]);

  const availablePlayers = useMemo(() => {
    if (!roomState) return [];
    return roomState.participants
      .filter(
        (p: Participant) => p.role === 'PLAYER' && !p.assignedTeamCaptainId,
      )
      .map((p: Participant) => ({
        id: p.user?.id || p.id,
        name: p.user?.battleTag?.split('#')[0] || '선수',
        role: (p.user?.mainRole?.toLowerCase() || 'flex') as
          | 'tank'
          | 'dps'
          | 'support'
          | 'flex',
      }));
  }, [roomState]);

  const handleBid = useCallback(() => {
    const currentPlayer = roomState?.currentPlayer;
    const currentBid = roomState?.currentBid;
    if (!currentPlayer) return;
    const newAmount = (currentBid?.amount || 0) + selectedBidAmount;
    placeBid(currentPlayer.id, newAmount);
  }, [roomState, selectedBidAmount, placeBid]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput, user?.battleTag?.split('#')[0] || '익명');
    setChatInput('');
  }, [chatInput, sendChatMessage, user]);

  return {
    // local state
    chatInput,
    setChatInput,
    selectedBidAmount,
    setSelectedBidAmount,
    selectedUnsoldPlayer,
    setSelectedUnsoldPlayer,
    // derived
    userRole,
    myTeam,
    availablePlayers,
    // actions
    handleBid,
    handleSendChat,
  };
}
