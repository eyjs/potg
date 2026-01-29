import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Clan } from '../../clans/entities/clan.entity';

export enum ReplayResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  DRAW = 'DRAW',
}

@Entity('replays')
export class Replay extends BaseEntity {
  @Column({ length: 10 })
  code: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  clanId: string;

  @ManyToOne(() => Clan)
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Column()
  mapName: string;

  @Column({ nullable: true })
  gamemode?: string;

  @Column({ type: 'simple-array' })
  heroes: string[];

  @Column({ type: 'enum', enum: ReplayResult })
  result: ReplayResult;

  @Column({ nullable: true })
  videoUrl?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  views: number;
}
