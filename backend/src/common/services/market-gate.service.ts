import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import {
  AttendanceRecord,
  AttendanceStatus,
} from '../../modules/attendance/entities/attendance-record.entity';
import { SystemConfigService } from '../../modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from '../../modules/system-config/entities/system-config.entity';

export interface MarketGateResult {
  passed: boolean;
  attendanceDays: number;
  requiredAttendanceDays: number;
  matchCount: number;
  requiredMatchCount: number;
}

/**
 * 마켓 게이트 검증 공통 서비스.
 *
 * HTTP 가드(MarketGateGuard)와 디스코드 명령(BuyCommand)에서 공유한다.
 * 단일 클랜 전환 시 clan_members 조인 한 곳만 수정하면 됨.
 */
@Injectable()
export class MarketGateService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    private readonly systemConfig: SystemConfigService,
  ) {}

  /**
   * 게이트 통과 여부 계산.
   * cachedPassed=true면 빠른 경로로 즉시 반환 (재계산 없음).
   */
  async check(
    userId: string,
    cachedPassed: boolean,
  ): Promise<MarketGateResult> {
    const requiredAttendanceDays = await this.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.MARKET_GATE_ATTENDANCE_DAYS,
      7,
    );
    const requiredMatchCount = await this.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.MARKET_GATE_MATCH_COUNT,
      2,
    );

    if (cachedPassed) {
      return {
        passed: true,
        attendanceDays: requiredAttendanceDays,
        requiredAttendanceDays,
        matchCount: requiredMatchCount,
        requiredMatchCount,
      };
    }

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

    return {
      passed:
        attendanceDays >= requiredAttendanceDays &&
        matchCount >= requiredMatchCount,
      attendanceDays,
      requiredAttendanceDays,
      matchCount,
      requiredMatchCount,
    };
  }

  /**
   * 통과 시 user.marketGatePassed 캐시 갱신 후 true.
   * 미통과 시 ForbiddenException throw — 호출자가 try/catch로 메시지 변환 가능.
   */
  async enforce(userId: string, cachedPassed: boolean): Promise<void> {
    const result = await this.check(userId, cachedPassed);
    if (result.passed) {
      if (!cachedPassed) {
        await this.userRepository.update(
          { id: userId },
          { marketGatePassed: true },
        );
      }
      return;
    }
    throw new ForbiddenException(
      `마켓 게이트 미통과: 출석 ${result.attendanceDays}/${result.requiredAttendanceDays}일, ` +
        `내전 ${result.matchCount}/${result.requiredMatchCount}회`,
    );
  }
}
