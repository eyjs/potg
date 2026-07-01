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

  @Column({ type: 'varchar', nullable: true })
  scrimId: string | null;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @Column({ type: 'int', default: 0 })
  bonusPoints: number;

  @Column({ type: 'varchar', nullable: true })
  bonusReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date | null;
}
