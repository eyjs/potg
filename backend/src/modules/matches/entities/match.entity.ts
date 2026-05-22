import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MatchStatus } from '../enums/match-status.enum';
import { Team } from './team.entity';

@Entity('matches')
@Index(['status'])
@Index(['scheduledAt'])
export class Match extends BaseEntity {
  @Column()
  title: string;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.DRAFT })
  status: MatchStatus;

  /** SETTLED 시 우승 팀 (WIN 시장 정산 기준). */
  @Column({ name: 'winner_team_id', type: 'uuid', nullable: true })
  winnerTeamId: string | null;

  @Column({ name: 'settled_at', type: 'timestamp', nullable: true })
  settledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => Team, (team) => team.match)
  teams: Team[];
}
