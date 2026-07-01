import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  db: boolean;
  timestamp: string;
}

/**
 * 운영 헬스 체크.
 *
 * - GET /health: DB ping.
 * - 항상 200 응답 — degraded여도 200으로 컨테이너 재시작은 회피 (개별 컴포넌트 자체 복구 신뢰).
 *
 * (Discord 봇 미연동으로 헬스 체크에서 제외됨.)
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: '운영 헬스 체크 (DB)' })
  async check(): Promise<HealthResponse> {
    let dbOk = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }

    return {
      status: dbOk ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      db: dbOk,
      timestamp: new Date().toISOString(),
    };
  }
}
