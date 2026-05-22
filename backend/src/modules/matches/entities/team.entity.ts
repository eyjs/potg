import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Match } from './match.entity';
import { TeamMember } from './team-member.entity';

@Entity('teams')
@Index(['matchId'])
export class Team extends BaseEntity {
  @Column({ name: 'match_id', type: 'uuid' })
  matchId: string;

  @ManyToOne(() => Match, (match) => match.teams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column()
  name: string;

  /** 팀장 (User.id). 경매에서 결정됨. */
  @Column({ name: 'captain_id', type: 'uuid', nullable: true })
  captainId: string | null;

  /** SETTLED 시 등수 (1~4). RANK 시장 정산 기준. */
  @Column({ type: 'int', nullable: true })
  placement: number | null;

  @OneToMany(() => TeamMember, (tm) => tm.team)
  members: TeamMember[];
}
