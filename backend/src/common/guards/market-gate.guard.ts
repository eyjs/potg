import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { AttendanceRecord, AttendanceStatus } from '../../modules/attendance/entities/attendance-record.entity';
import { SystemConfigService } from '../../modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from '../../modules/system-config/entities/system-config.entity';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * 마켓 게이트.
 *
 * 통과 조건 (SystemConfig 키로 조정 가능):
 *   - 출석 PRESENT/LATE 일수 ≥ MARKET_GATE_ATTENDANCE_DAYS (기본 7)
 *   - 내전 참석 수 ≥ MARKET_GATE_MATCH_COUNT (기본 2)
 *
 * 통과 시 user.marketGatePassed = true 로 캐시한다.
 * 한번 통과한 사용자는 빠른 경로(캐시)로 통과시키며, 미통과자만 매번 재계산.
 *
 * 본 가드는 실물 마켓(MarketOrder 생성) 엔드포인트에만 부착한다.
 */
@Injectable()
export class MarketGateGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User not found: ${userId}`);

    // 캐시 빠른 경로.
    if (user.marketGatePassed) return true;

    const requiredAttendanceDays = await this.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.MARKET_GATE_ATTENDANCE_DAYS,
      7,
    );
    const requiredMatchCount = await this.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.MARKET_GATE_MATCH_COUNT,
      2,
    );

    const attendanceDays = await this.attendanceRepository
      .createQueryBuilder('ar')
      .innerJoin('clan_members', 'cm', 'cm.id = ar.memberId')
      .where('cm.userId = :userId', { userId })
      .andWhere('ar.status IN (:...active)', {
        active: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
      })
      .andWhere('ar.scrimId IS NULL')
      .getCount();

    const matchCount = await this.attendanceRepository
      .createQueryBuilder('ar')
      .innerJoin('clan_members', 'cm', 'cm.id = ar.memberId')
      .where('cm.userId = :userId', { userId })
      .andWhere('ar.status IN (:...active)', {
        active: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
      })
      .andWhere('ar.scrimId IS NOT NULL')
      .getCount();

    const passed =
      attendanceDays >= requiredAttendanceDays &&
      matchCount >= requiredMatchCount;

    if (passed) {
      user.marketGatePassed = true;
      await this.userRepository.save(user);
      return true;
    }

    throw new ForbiddenException(
      `Market gate not passed: attendance=${attendanceDays}/${requiredAttendanceDays}, ` +
        `matches=${matchCount}/${requiredMatchCount}`,
    );
  }
}
