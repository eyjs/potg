import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from './clan-member.entity';

@Entity('clans')
export class Clan extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  tag: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => ClanMember, (member) => member.clan)
  members: ClanMember[];
}
