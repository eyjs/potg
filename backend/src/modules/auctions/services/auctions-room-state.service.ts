import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Auction,
  AuctionStatus,
  BiddingPhase,
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
    currentBiddingPlayerId: string | null;
    currentBiddingEndTime: Date | null;
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
    user: {
      id: string;
      battleTag: string | null;
      mainRole: string | null;
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
  } | null;
  teams: {
    captainId: string;
    captainName: string;
    points: number;
    members: {
      id: string;
      name: string;
      role: string;
      price: number;
      wasUnsold: boolean;
    }[];
  }[];
  unsoldPlayers: {
    id: string;
    name: string;
    role: string;
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
        captainName: captain.user?.battleTag || '캡틴',
        points: captain.currentPoints,
        members: teamMembers.map((m) => ({
          id: m.userId,
          name: m.user?.battleTag?.split('#')[0] || '선수',
          role: m.user?.mainRole?.toLowerCase() || 'flex',
          price: m.soldPrice || 0,
          wasUnsold: m.wasUnsold,
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
          bidderName: bidder?.user?.battleTag || '익명',
          amount: highestBid.amount,
        };
      }
    }

    let currentPlayer: { id: string; name: string; role: string } | null = null;
    if (auction.currentBiddingPlayerId) {
      const player = participants.find(
        (p) => p.userId === auction.currentBiddingPlayerId,
      );
      if (player) {
        currentPlayer = {
          id: player.userId,
          name: player.user?.battleTag?.split('#')[0] || '선수',
          role: player.user?.mainRole?.toLowerCase() || 'flex',
        };
      }
    }

    const unsoldPlayers = participants
      .filter((p) => p.role === AuctionRole.PLAYER && !p.assignedTeamCaptainId)
      .map((p) => ({
        id: p.userId,
        name: p.user?.battleTag?.split('#')[0] || '선수',
        role: p.user?.mainRole?.toLowerCase() || 'flex',
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
        currentBiddingPlayerId: auction.currentBiddingPlayerId,
        currentBiddingEndTime: auction.currentBiddingEndTime,
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
        user: p.user
          ? {
              id: p.user.id,
              battleTag: p.user.battleTag ?? null,
              mainRole: p.user.mainRole ?? null,
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
