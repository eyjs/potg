import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PointRule, PointRuleCategory } from './entities/point-rule.entity';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import { CreatePointRuleDto, UpdatePointRuleDto } from './dto/point-rule.dto';
import { ClanMember } from '../clans/entities/clan-member.entity';

const DEFAULT_RULES: Omit<CreatePointRuleDto, 'category'>[] & { category: PointRuleCategory }[] = [
  { code: 'ATTENDANCE_BASE', name: '출석 기본 포인트', category: PointRuleCategory.ATTENDANCE, points: 100 },
  { code: 'STREAK_3', name: '3연속 출석 보너스', category: PointRuleCategory.ATTENDANCE, points: 100 },
  { code: 'STREAK_5', name: '5연속 출석 보너스', category: PointRuleCategory.ATTENDANCE, points: 300 },
  { code: 'STREAK_10', name: '10연속 출석 보너스', category: PointRuleCategory.ATTENDANCE, points: 500 },
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
      relations: ['member', 'member.user'],
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
