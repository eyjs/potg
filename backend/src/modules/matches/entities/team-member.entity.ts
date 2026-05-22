import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Team } from './team.entity';

@Entity('team_members')
@Index(['teamId'])
@Unique('uq_team_member', ['teamId', 'userId'])
export class TeamMember extends BaseEntity {
  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** 경매 낙찰가 (포인트). nullable: 비-경매 편성 시. */
  @Column({ name: 'bid_price', type: 'bigint', nullable: true })
  bidPrice: string | null;
}
