import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Clan } from './clan.entity';
import { User } from '../../users/entities/user.entity';

@Entity('announcements')
export class Announcement extends BaseEntity {
  @Column()
  clanId: string;

  @ManyToOne(() => Clan)
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Column()
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: true })
  isActive: boolean;
}
