import { renderHook, act } from '@testing-library/react';
import { useAuctionRoom } from './use-auction-room';

/**
 * 최소 mocked RoomState helper.
 * 실제 useAuctionSocket return 타입을 정확히 흉내내기보다, 본 hook 이 의존하는
 * 필드만 채워서 derived state 계산이 올바른지 확인.
 */
function buildRoomState(overrides?: Partial<MockedRoomState>): MockedRoomState {
  return {
    auction: {
      id: 'a1',
      creatorId: 'creator-1',
      teamCount: 2,
      startingPoints: 10000,
      turnTimeLimit: 30,
      currentBiddingPlayerId: null,
      currentBiddingEndTime: null,
      timerPaused: false,
      pausedTimeRemaining: null,
      status: 'PENDING',
      biddingPhase: 'WAITING',
      title: 'test',
    },
    participants: [],
    teams: [],
    unsoldPlayers: [],
    currentPlayer: null,
    currentBid: null,
    ...overrides,
  };
}

type MockedRoomState = Parameters<typeof useAuctionRoom>[0]['roomState'] extends
  | infer R
  | null
  ? NonNullable<R>
  : never;

describe('useAuctionRoom', () => {
  const placeBid = vi.fn();
  const sendChatMessage = vi.fn();

  beforeEach(() => {
    placeBid.mockClear();
    sendChatMessage.mockClear();
  });

  it('초기 state: chat 빈값, bid 100, selectedUnsoldPlayer null', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'u1', role: 'USER' },
        roomState: null,
        placeBid,
        sendChatMessage,
      }),
    );
    expect(result.current.chatInput).toBe('');
    expect(result.current.selectedBidAmount).toBe(100);
    expect(result.current.selectedUnsoldPlayer).toBeNull();
    expect(result.current.availablePlayers).toEqual([]);
  });

  it('ADMIN role 유저는 userRole === admin', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'u1', role: 'ADMIN' },
        roomState: buildRoomState(),
        placeBid,
        sendChatMessage,
      }),
    );
    expect(result.current.userRole).toBe('admin');
  });

  it('roomState.auction.creatorId 와 일치하면 admin', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'creator-1', role: 'USER' },
        roomState: buildRoomState(),
        placeBid,
        sendChatMessage,
      }),
    );
    expect(result.current.userRole).toBe('admin');
  });

  it('participants 에 CAPTAIN role 이 있으면 captain', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'u-cap', role: 'USER' },
        roomState: buildRoomState({
          participants: [
            {
              id: 'p1',
              role: 'CAPTAIN',
              user: { id: 'u-cap' },
              assignedTeamCaptainId: null,
            },
          ],
        } as Partial<MockedRoomState>),
        placeBid,
        sendChatMessage,
      }),
    );
    expect(result.current.userRole).toBe('captain');
  });

  it('아무 매칭도 없으면 spectator', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'rand', role: 'USER' },
        roomState: buildRoomState(),
        placeBid,
        sendChatMessage,
      }),
    );
    expect(result.current.userRole).toBe('spectator');
  });

  it('availablePlayers: PLAYER role + assignedTeamCaptainId null 만 포함', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'u1', role: 'USER' },
        roomState: buildRoomState({
          participants: [
            {
              id: 'p1',
              role: 'PLAYER',
              user: { id: 'a', battleTag: 'Alpha#1', mainRole: 'TANK' },
              assignedTeamCaptainId: null,
            },
            {
              id: 'p2',
              role: 'PLAYER',
              user: { id: 'b', battleTag: 'Bravo#2', mainRole: 'DPS' },
              assignedTeamCaptainId: 'team-1',
            },
            {
              id: 'p3',
              role: 'CAPTAIN',
              user: { id: 'c' },
              assignedTeamCaptainId: null,
            },
          ],
        } as Partial<MockedRoomState>),
        placeBid,
        sendChatMessage,
      }),
    );
    expect(result.current.availablePlayers).toHaveLength(1);
    expect(result.current.availablePlayers[0]).toMatchObject({
      id: 'a',
      name: 'Alpha',
      role: 'tank',
    });
  });

  it('handleBid: currentPlayer + currentBid 기반으로 placeBid 호출', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'u1', role: 'USER' },
        roomState: buildRoomState({
          currentPlayer: { id: 'pid', name: 'Player1', role: 'tank' },
          currentBid: { bidderId: 'b1', bidderName: 'B', amount: 500 },
        } as Partial<MockedRoomState>),
        placeBid,
        sendChatMessage,
      }),
    );
    act(() => result.current.setSelectedBidAmount(200));
    act(() => result.current.handleBid());
    expect(placeBid).toHaveBeenCalledWith('pid', 700);
  });

  it('handleSendChat: chatInput 비어있으면 send 안함, 채우면 호출 + 초기화', () => {
    const { result } = renderHook(() =>
      useAuctionRoom({
        user: { id: 'u1', role: 'USER', battleTag: 'Tester#1' },
        roomState: buildRoomState(),
        placeBid,
        sendChatMessage,
      }),
    );
    act(() => result.current.handleSendChat());
    expect(sendChatMessage).not.toHaveBeenCalled();

    act(() => result.current.setChatInput('hello'));
    act(() => result.current.handleSendChat());
    expect(sendChatMessage).toHaveBeenCalledWith('hello', 'Tester');
    expect(result.current.chatInput).toBe('');
  });
});
