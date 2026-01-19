import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BlindDateListing } from './blind-date-listing.entity';
import { BlindDateRequest } from './blind-date-request.entity';
import { User } from '../../users/entities/user.entity';
import { Clan } from '../../clans/entities/clan.entity';

@Entity('blind_date_matches')
export class BlindDateMatch extends BaseEntity {
  @Column()
  listingId: string;

  @Column()
  requestId: string;

  @Column()
  clanId: string;

  @Column()
  registerId: string;

  @Column()
  requesterId: string;

  @ManyToOne(() => BlindDateListing)
  @JoinColumn({ name: 'listingId' })
  listing: BlindDateListing;

  @ManyToOne(() => BlindDateRequest)
  @JoinColumn({ name: 'requestId' })
  request: BlindDateRequest;

  @ManyToOne(() => Clan)
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'registerId' })
  register: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column()
  pointsAwarded: number;
}
