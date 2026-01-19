import { AuctionRole } from '../entities/auction-participant.entity';

export class CreateAuctionDto {
    title: string;
    startingPoints: number;
    turnTimeLimit?: number;
    accessCode?: string;
}

export class JoinAuctionDto {
    role: AuctionRole;
}

export class BidDto {
    targetPlayerId: string;
    amount: number;
}
