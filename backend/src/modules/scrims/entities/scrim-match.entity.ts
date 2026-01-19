import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Scrim } from './scrim.entity';

@Entity('scrim_matches')
export class ScrimMatch extends BaseEntity {
  @ManyToOne(() => Scrim, (scrim) => scrim.matches)
  scrim: Scrim;

  @Column()
  scrimId: string;

  @Column()
  mapName: string;

  @Column({ type: 'int' })
  teamAScore: number;

  @Column({ type: 'int' })
  teamBScore: number;

  @Column({ nullable: true })
  screenshotUrl: string; // For result verification
}
