import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GameRoom } from './game-room.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

export enum PlayerStatus {
  WAITING = 'WAITING',    // 대기 중
  READY = 'READY',        // 준비 완료
  PLAYING = 'PLAYING',    // 게임 중
  SPECTATING = 'SPECTATING', // 관전
}

@Entity('game_room_players')
@Unique(['roomId', 'memberId'])
export class GameRoomPlayer extends BaseEntity {
  @Column()
  @Index()
  roomId: string;

  @Column()
  @Index()
  memberId: string;

  @Column({ type: 'enum', enum: PlayerStatus, default: PlayerStatus.WAITING })
  status: PlayerStatus;

  @Column({ type: 'int', default: 0 })
  score: number; // 이번 게임 점수

  @Column({ type: 'int', default: 0 })
  order: number; // 턴 순서

  @Column({ type: 'varchar', nullable: true })
  role: string; // 게임별 역할 (라이어게임: 'LIAR' | 'CITIZEN')

  @Column({ type: 'boolean', default: false })
  isHost: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @ManyToOne(() => GameRoom, (r) => r.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: GameRoom;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}
