import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { PointRule, PointRuleCategory } from './entities/point-rule.entity';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import { CreatePointRuleDto, UpdatePointRuleDto } from './dto/point-rule.dto';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';
import { Scrim } from '../scrims/entities/scrim.entity';
import { ParticipantStatus } from '../scrims/entities/scrim-participant.entity';

const DEFAULT_RULES: Omit<CreatePointRuleDto, 'category'>[] & { category: PointRuleCategory }[] = [
  { code: 'ATTENDANCE_BASE', name: '출석 기본 포인트', category: PointRuleCategory.ATTENDANCE, points: 100 },
  { code: 'STREAK_3', name: '3연속 출석 보너스', category: PointRuleCategory.ATTENDANCE, points: 100 },
  { code: 'STREAK_5', name: '5연속 출석 보너스', category: PointRuleCategory.ATTENDANCE, points: 300 },
  { code: 'STREAK_10', name: '10연속 출석 보너스', category: PointRuleCategory.ATTENDANCE, points: 500 },
  { code: 'SCRIM_WIN', name: '내전 승리 보너스', category: PointRuleCategory.ACTIVITY, points: 1000 },
];

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(PointRule)
    private pointRuleRepository: Repository<PointRule>,
    @InjectRepository(AttendanceRecord)
    private attendanceRecordRepository: Repository<AttendanceRecord>,
    @InjectRepository(ClanMember)
    private clanMemberRepository: Repository<ClanMember>,
    private dataSource: DataSource,
  ) {}

  // ========== PointRule CRUD ==========

  async findRules(clanId: string): Promise<PointRule[]> {
    return this.pointRuleRepository.find({
      where: { clanId },
      order: { category: 'ASC', code: 'ASC' },
    });
  }

  async createRule(clanId: string, dto: CreatePointRuleDto): Promise<PointRule> {
    const existing = await this.pointRuleRepository.findOne({
      where: { clanId, code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`이미 존재하는 규칙 코드입니다: ${dto.code}`);
    }

    const rule = this.pointRuleRepository.create({ ...dto, clanId });
    return this.pointRuleRepository.save(rule);
  }

  async updateRule(clanId: string, id: string, dto: UpdatePointRuleDto): Promise<PointRule> {
    const rule = await this.pointRuleRepository.findOne({
      where: { id, clanId },
    });
    if (!rule) throw new NotFoundException('규칙을 찾을 수 없습니다.');

    if (dto.code && dto.code !== rule.code) {
      const existing = await this.pointRuleRepository.findOne({
        where: { clanId, code: dto.code },
      });
      if (existing) {
        throw new BadRequestException(`이미 존재하는 규칙 코드입니다: ${dto.code}`);
      }
    }

    Object.assign(rule, dto);
    return this.pointRuleRepository.save(rule);
  }

  async deleteRule(clanId: string, id: string): Promise<{ message: string }> {
    const rule = await this.pointRuleRepository.findOne({
      where: { id, clanId },
    });
    if (!rule) throw new NotFoundException('규칙을 찾을 수 없습니다.');

    await this.pointRuleRepository.remove(rule);
    return { message: '규칙이 삭제되었습니다.' };
  }

  async seedDefaultRules(clanId: string): Promise<PointRule[]> {
    const existing = await this.pointRuleRepository.find({ where: { clanId } });
    const existingCodes = new Set(existing.map((r) => r.code));

    const toCreate = DEFAULT_RULES.filter((r) => !existingCodes.has(r.code));
    if (toCreate.length === 0) {
      throw new BadRequestException('모든 기본 규칙이 이미 존재합니다.');
    }

    const rules = toCreate.map((r) =>
      this.pointRuleRepository.create({ ...r, clanId }),
    );
    return this.pointRuleRepository.save(rules);
  }

  // ========== Attendance ==========

  async getAttendanceHistory(
    clanId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ records: AttendanceRecord[]; total: number }> {
    const [records, total] = await this.attendanceRecordRepository.findAndCount({
      where: { member: { clanId } },
      relations: ['member', 'member.user', 'scrim'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { records, total };
  }

  async getAttendanceStats(clanId: string): Promise<AttendanceStatsResult[]> {
    const members = await this.clanMemberRepository.find({
      where: { clanId },
      relations: ['user'],
    });

    const stats: AttendanceStatsResult[] = [];

    for (const member of members) {
      const records = await this.attendanceRecordRepository.find({
        where: { memberId: member.id },
        order: { createdAt: 'DESC' },
      });

      const totalRecords = records.length;
      const presentCount = records.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
      ).length;
      const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      const currentStreak = this.calculateCurrentStreak(records);
      const totalPointsEarned = records.reduce(
        (sum, r) => sum + r.pointsEarned + r.bonusPoints,
        0,
      );

      stats.push({
        memberId: member.id,
        userId: member.userId,
        battleTag: member.user?.battleTag || 'Unknown',
        avatarUrl: member.user?.avatarUrl || null,
        totalRecords,
        presentCount,
        attendanceRate,
        currentStreak,
        totalPointsEarned,
      });
    }

    return stats.sort((a, b) => b.attendanceRate - a.attendanceRate);
  }

  /**
   * 내전 종료 시 호출: 참여자 출석 기록 생성 + 기본 포인트/보너스 지급
   * manager를 받아 트랜잭션 내에서 실행
   */
  async generateAttendanceFromScrim(
    scrimId: string,
    manager: EntityManager,
  ): Promise<AttendanceRecord[]> {
    const scrim = await manager.findOne(Scrim, {
      where: { id: scrimId },
      relations: ['participants'],
    });
    if (!scrim || !scrim.clanId) return [];

    // 이미 출석 기록이 있는지 확인
    const existingRecords = await manager.find(AttendanceRecord, {
      where: { scrimId },
    });
    if (existingRecords.length > 0) return existingRecords;

    // 해당 클랜의 포인트 규칙 조회
    const rules = await manager.find(PointRule, {
      where: { clanId: scrim.clanId, isActive: true },
    });
    const ruleMap = new Map(rules.map((r) => [r.code, r.points]));

    const basePoints = ruleMap.get('ATTENDANCE_BASE') ?? 100;
    const streak3Bonus = ruleMap.get('STREAK_3') ?? 100;
    const streak5Bonus = ruleMap.get('STREAK_5') ?? 300;
    const streak10Bonus = ruleMap.get('STREAK_10') ?? 500;

    const confirmedParticipants = scrim.participants.filter(
      (p) => p.status === ParticipantStatus.CONFIRMED,
    );

    const records: AttendanceRecord[] = [];

    for (const participant of confirmedParticipants) {
      const clanMember = await manager.findOne(ClanMember, {
        where: { userId: participant.userId, clanId: scrim.clanId },
      });
      if (!clanMember) continue;

      // 출석 상태 결정: 체크인 여부로 판정
      const status = participant.checkedIn
        ? AttendanceStatus.PRESENT
        : AttendanceStatus.ABSENT;

      // 연속 출석 계산
      const previousRecords = await manager.find(AttendanceRecord, {
        where: { memberId: clanMember.id },
        order: { createdAt: 'DESC' },
        take: 20,
      });

      const currentStreak = this.calculateCurrentStreak(previousRecords);
      // 이번 출석을 더한 연속 카운트
      const newStreak = status === AttendanceStatus.PRESENT ? currentStreak + 1 : 0;

      // 보너스 계산: 가장 높은 티어만 적용
      let bonusPoints = 0;
      let bonusReason: string | undefined = undefined;

      if (status === AttendanceStatus.PRESENT) {
        if (newStreak >= 10 && newStreak % 10 === 0) {
          bonusPoints = streak10Bonus;
          bonusReason = `${newStreak}연속 출석 (10연속 보너스)`;
        } else if (newStreak >= 5 && newStreak % 5 === 0) {
          bonusPoints = streak5Bonus;
          bonusReason = `${newStreak}연속 출석 (5연속 보너스)`;
        } else if (newStreak >= 3 && newStreak % 3 === 0) {
          bonusPoints = streak3Bonus;
          bonusReason = `${newStreak}연속 출석 (3연속 보너스)`;
        }
      }

      const pointsEarned = status === AttendanceStatus.PRESENT ? basePoints : 0;

      const record = manager.create(AttendanceRecord, {
        memberId: clanMember.id,
        scrimId,
        status,
        pointsEarned,
        bonusPoints,
        bonusReason,
        checkedInAt: participant.checkedInAt || undefined,
      });

      const savedRecord = await manager.save(record);
      records.push(savedRecord);

      // 포인트 지급
      const totalReward = pointsEarned + bonusPoints;
      if (totalReward > 0) {
        clanMember.totalPoints += totalReward;
        await manager.save(clanMember);

        // 기본 출석 포인트 로그
        if (pointsEarned > 0) {
          const baseLog = manager.create(PointLog, {
            userId: participant.userId,
            clanId: scrim.clanId,
            amount: pointsEarned,
            reason: `ATTENDANCE:${scrimId}`,
          });
          await manager.save(baseLog);
        }

        // 연속 출석 보너스 로그
        if (bonusPoints > 0) {
          const bonusLog = manager.create(PointLog, {
            userId: participant.userId,
            clanId: scrim.clanId,
            amount: bonusPoints,
            reason: `ATTENDANCE_STREAK:${scrimId}:${bonusReason}`,
          });
          await manager.save(bonusLog);
        }
      }
    }

    return records;
  }

  private calculateCurrentStreak(records: AttendanceRecord[]): number {
    let streak = 0;
    for (const record of records) {
      if (
        record.status === AttendanceStatus.PRESENT ||
        record.status === AttendanceStatus.LATE
      ) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}

export interface AttendanceStatsResult {
  memberId: string;
  userId: string;
  battleTag: string;
  avatarUrl: string | null;
  totalRecords: number;
  presentCount: number;
  attendanceRate: number;
  currentStreak: number;
  totalPointsEarned: number;
}
