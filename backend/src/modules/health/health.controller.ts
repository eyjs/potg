import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { DiscordClientService } from '../discord-bot/discord-client.service';

interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  db: boolean;
  discord: { enabled: boolean; ready: boolean };
  timestamp: string;
}

/**
 * 운영 헬스 체크.
 *
 * - GET /health: DB ping + Discord 클라이언트 준비 여부.
 * - 항상 200 응답 — degraded여도 200으로 컨테이너 재시작은 회피 (개별 컴포넌트 자체 복구 신뢰).
 *   k8s readiness/liveness 분리가 필요하면 별도 endpoint 추가 검토.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly discord: DiscordClientService,
  ) {}

  @Get()
  @ApiOperation({ summary: '운영 헬스 체크 (DB + Discord)' })
  async check(): Promise<HealthResponse> {
    let dbOk = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const discordEnabled = this.discord.isEnabled();
    const discordReady = this.discord.isReady();

    // 봇이 enabled면 ready여야 정상. disabled면 ready 무관하게 OK.
    const discordOk = discordEnabled ? discordReady : true;
    const status: 'ok' | 'degraded' = dbOk && discordOk ? 'ok' : 'degraded';

    return {
      status,
      uptime: Math.floor(process.uptime()),
      db: dbOk,
      discord: { enabled: discordEnabled, ready: discordReady },
      timestamp: new Date().toISOString(),
    };
  }
}
