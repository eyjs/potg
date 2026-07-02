import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Auction,
  AuctionStatus,
  BiddingPhase,
  RosterMode,
} from '../entities/auction.entity';
import { AuctionRole } from '../entities/auction-participant.entity';

export interface RoomState {
  auction: {
    id: string;
    title: string;
    status: AuctionStatus;
    biddingPhase: BiddingPhase;
    startingPoints: number;
    turnTimeLimit: number;
    teamCount: number;
    rosterMode: RosterMode;
    currentBiddingPlayerId: string | null;
    // socket.io 직렬화 계약: ISO 문자열 (frontend types.ts 미러와 일치)
    currentBiddingEndTime: string | null;
    timerPaused: boolean;
    pausedTimeRemaining: number | null;
    creatorId: string;
  };
  participants: {
    id: string;
    userId: string;
    role: AuctionRole;
    currentPoints: number;
    assignedTeamCaptainId: string | null;
    wasUnsold: boolean;
    biddingOrder: number;
    teamName: string | null;
    user: {
      id: string;
      nickname: string | null;
      battleTag: string | null;
      mainRole: string | null;
      avatarUrl: string | null;
      representativeHero: string | null;
    } | null;
  }[];
  currentBid: {
    bidderId: string;
    bidderName: string;
    amount: number;
  } | null;
  currentPlayer: {
    id: string;
    name: string;
    role: string;
    hero: string | null;
    avatarUrl: string | null;
  } | null;
  teams: {
    captainId: string;
    captainName: string;
    captainAvatarUrl: string | null;
    teamName: string | null;
    points: number;
    members: {
      id: string;
      name: string;
      role: string;
      price: number;
      wasUnsold: boolean;
      avatarUrl: string | null;
      hero: string | null;
    }[];
  }[];
  unsoldPlayers: {
    id: string;
    name: string;
    role: string;
    hero: string | null;
    avatarUrl: string | null;
    wasUnsold: boolean;
  }[];
}

/**
 * Auction Room의 현재 상태를 클라이언트 친화적 DTO로 조립하는 read-only 서비스.
 *
 * - participants / bids를 한 번 로드하여 teams/currentBid/currentPlayer/unsoldPlayers
 *   파생 뷰를 메모리에서 계산한다.
 * - 트랜잭션 불필요 (read-only).
 */
@Injectable()
export class AuctionsRoomStateService {
  constructor(
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
  ) {}

  /** 표시명: 회원관리 기반 운영이므로 nickname 우선, battleTag(#앞) 폴백. */
  private displayName(
    user:
      | { nickname?: string | null; battleTag?: string | null }
      | null
      | undefined,
    fallback: string,
  ): string {
    return user?.nickname || user?.battleTag?.split('#')[0] || fallback;
  }

  async getRoomState(auctionId: string): Promise<RoomState> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: ['participants', 'participants.user', 'bids'],
    });

    if (!auction) {
      throw new BadRequestException('경매를 찾을 수 없습니다.');
    }

    const participants = auction.participants || [];
    const bids = auction.bids || [];

    const captains = participants.filter((p) => p.role === AuctionRole.CAPTAIN);
    const teams = captains.map((captain) => {
      const teamMembers = participants.filter(
        (p) =>
          p.role === AuctionRole.PLAYER &&
          p.assignedTeamCaptainId === captain.userId,
      );

      return {
        captainId: captain.userId,
        captainName: this.displayName(captain.user, '캡틴'),
        captainAvatarUrl: captain.user?.avatarUrl ?? null,
        teamName: captain.teamName ?? null,
        points: captain.currentPoints,
        members: teamMembers.map((m) => ({
          id: m.userId,
          name: this.displayName(m.user, '선수'),
          role: m.user?.mainRole?.toLowerCase() || 'flex',
          price: m.soldPrice || 0,
          wasUnsold: m.wasUnsold,
          avatarUrl: m.user?.avatarUrl ?? null,
          hero: m.user?.representativeHero ?? null,
        })),
      };
    });

    let currentBid: {
      bidderId: string;
      bidderName: string;
      amount: number;
    } | null = null;
    if (auction.currentBiddingPlayerId) {
      const highestBid = bids
        .filter(
          (b) =>
            b.targetPlayerId === auction.currentBiddingPlayerId && b.isActive,
        )
        .sort((a, b) => b.amount - a.amount)[0];

      if (highestBid) {
        const bidder = participants.find(
          (p) => p.userId === highestBid.bidderId,
        );
        currentBid = {
          bidderId: highestBid.bidderId,
          bidderName: this.displayName(bidder?.user, '익명'),
          amount: highestBid.amount,
        };
      }
    }

    let currentPlayer: RoomState['currentPlayer'] = null;
    if (auction.currentBiddingPlayerId) {
      const player = participants.find(
        (p) => p.userId === auction.currentBiddingPlayerId,
      );
      if (player) {
        currentPlayer = {
          id: player.userId,
          name: this.displayName(player.user, '선수'),
          role: player.user?.mainRole?.toLowerCase() || 'flex',
          hero: player.user?.representativeHero ?? null,
          avatarUrl: player.user?.avatarUrl ?? null,
        };
      }
    }

    const unsoldPlayers = participants
      .filter((p) => p.role === AuctionRole.PLAYER && !p.assignedTeamCaptainId)
      .map((p) => ({
        id: p.userId,
        name: this.displayName(p.user, '선수'),
        role: p.user?.mainRole?.toLowerCase() || 'flex',
        hero: p.user?.representativeHero ?? null,
        avatarUrl: p.user?.avatarUrl ?? null,
        wasUnsold: p.wasUnsold,
      }));

    return {
      auction: {
        id: auction.id,
        title: auction.title,
        status: auction.status,
        biddingPhase: auction.biddingPhase,
        startingPoints: auction.startingPoints,
        turnTimeLimit: auction.turnTimeLimit,
        teamCount: auction.teamCount,
        rosterMode: auction.rosterMode,
        currentBiddingPlayerId: auction.currentBiddingPlayerId,
        currentBiddingEndTime:
          auction.currentBiddingEndTime?.toISOString() ?? null,
        timerPaused: auction.timerPaused,
        pausedTimeRemaining: auction.pausedTimeRemaining,
        creatorId: auction.creatorId,
      },
      participants: participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        currentPoints: p.currentPoints,
        assignedTeamCaptainId: p.assignedTeamCaptainId,
        wasUnsold: p.wasUnsold,
        biddingOrder: p.biddingOrder,
        teamName: p.teamName ?? null,
        user: p.user
          ? {
              id: p.user.id,
              nickname: p.user.nickname ?? null,
              battleTag: p.user.battleTag ?? null,
              representativeHero: p.user.representativeHero ?? null,
              mainRole: p.user.mainRole ?? null,
              avatarUrl: p.user.avatarUrl ?? null,
            }
          : null,
      })),
      currentBid,
      currentPlayer,
      teams,
      unsoldPlayers,
    };
  }
}
