import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Game } from './game.entity';
import { GameRoomPlayer } from './game-room-player.entity';

export enum GameRoomStatus {
  WAITING = 'WAITING',     // 대기 중
  PLAYING = 'PLAYING',     // 진행 중
  FINISHED = 'FINISHED',   // 종료
}

@Entity('game_rooms')
export class GameRoom extends BaseEntity {
  @Column()
  @Index()
  gameId: string;

  @Column()
  clanId: string;

  @Column()
  hostId: string; // 방장 memberId

  @Column({ length: 6, unique: true })
  code: string; // 입장 코드 (ABCD12)

  @Column({ type: 'enum', enum: GameRoomStatus, default: GameRoomStatus.WAITING })
  status: GameRoomStatus;

  @Column({ type: 'int', default: 8 })
  maxPlayers: number;

  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown>;
  // 게임별 설정:
  // WORD_CHAIN: { timeLimit, rounds }
  // LIAR: { discussionTime, voteTime }
  // CATCH_MIND: { drawTime, rounds }

  @Column({ type: 'jsonb', nullable: true })
  gameState: Record<string, unknown>;
  // 게임 진행 상태:
  // WORD_CHAIN: { currentWord, currentPlayerIdx, usedWords }
  // LIAR: { liarId, topic, word, votes }
  // CATCH_MIND: { drawerId, word, guessedPlayers }

  @Column({ type: 'int', default: 0 })
  currentRound: number;

  @Column({ type: 'int', default: 3 })
  totalRounds: number;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @OneToMany(() => GameRoomPlayer, (p) => p.room)
  players: GameRoomPlayer[];
}
