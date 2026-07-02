import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Auction } from './auction.entity';

/**
 * 경매방 채팅 메시지 (영속) — 늦게 입장/재접속한 유저에게 히스토리를 제공하기 위해 저장한다.
 * id/createdAt 은 BaseEntity 에서 제공. 입장 시 auctionId 로 최근 N건을 조회한다.
 */
@Entity('auction_chat_messages')
@Index(['auctionId', 'createdAt'])
export class AuctionChatMessage extends BaseEntity {
  @Column()
  auctionId: string;

  @ManyToOne(() => Auction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;

  @Column()
  userId: string;

  /** 전송 시점 표시명 스냅샷 (닉네임 변경/탈퇴에도 히스토리 보존). */
  @Column({ name: 'user_name' })
  userName: string;

  @Column({ type: 'text' })
  message: string;
}
