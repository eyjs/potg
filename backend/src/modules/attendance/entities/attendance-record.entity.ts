import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
}

@Entity('attendance_records')
export class AttendanceRecord extends BaseEntity {
  @Column()
  memberId: string;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;

  @Column({ nullable: true })
  scrimId: string;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @Column({ type: 'int', default: 0 })
  bonusPoints: number;

  @Column({ nullable: true })
  bonusReason: string;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;
}
