import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MatchService } from './match.service';
import { CreateMatchDto, CreateTeamDto, SettleMatchDto } from './dto/match.dto';
import { BettingNotifyService } from '../discord-bot/notifications/betting-notify.service';
import { BettingService } from '../betting/betting.service';

@ApiTags('admin-matches')
@ApiCookieAuth('access_token')
@Controller('admin/matches')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class MatchController {
  constructor(
    private readonly matches: MatchService,
    @Inject(forwardRef(() => BettingNotifyService))
    private readonly notify: BettingNotifyService,
    @Inject(forwardRef(() => BettingService))
    private readonly betting: BettingService,
  ) {}

  @Get()
  @ApiOperation({ summary: '내전 목록 조회' })
  list() {
    return this.matches.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '내전 상세 + 팀 조회' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.findOneWithTeams(id);
  }

  @Post()
  @ApiOperation({ summary: '내전 생성 (DRAFT 상태)' })
  create(@Body() dto: CreateMatchDto) {
    return this.matches.create({
      title: dto.title,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      description: dto.description ?? null,
    });
  }

  @Post(':id/teams')
  @ApiOperation({ summary: '내전에 팀 추가' })
  createTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.matches.createTeam(id, dto.name, dto.captainId);
  }

  @Post(':id/open')
  @ApiOperation({ summary: '베팅 오픈 (DRAFT → BETTING_OPEN)' })
  openBetting(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.openBetting(id);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: '베팅 락 (BETTING_OPEN → LOCKED)' })
  lock(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.lockMatch(id);
  }

  @Post(':id/settle')
  @ApiOperation({ summary: '내전 정산 (LOCKED → SETTLED, 베팅 페이아웃)' })
  async settle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleMatchDto,
  ) {
    const result = await this.matches.settleMatch(
      id,
      dto.winnerTeamId,
      dto.placements,
    );
    const { match, settlements } = result;

    // 정산 결과가 있는 마켓들만 합산하여 Discord 알림 (best-effort)
    const settled = settlements.filter((s) => s.summary !== null);
    if (settled.length > 0) {
      try {
        const withTeams = await this.matches.findOneWithTeams(match.id);
        const winnerTeam = withTeams.teams.find(
          (t) => t.id === dto.winnerTeamId,
        );
        const totalPool = settled.reduce(
          (sum, s) => sum + (s.summary?.totalPool ?? 0n),
          0n,
        );
        const payoutDistributed = settled.reduce(
          (sum, s) => sum + (s.summary?.payoutDistributed ?? 0n),
          0n,
        );
        const winnersCount = settled.reduce(
          (sum, s) => sum + (s.summary?.winnersCount ?? 0),
          0,
        );
        await this.notify.notifyMarketSettled({
          matchId: match.id,
          title: match.title,
          winnerName: winnerTeam?.name ?? '?',
          totalPool: totalPool.toString(),
          payoutDistributed: payoutDistributed.toString(),
          winnersCount,
        });

        // 베팅자 개인 DM (best-effort, 별도 try)
        const stakes = await this.betting.findStakesForMatchSettlement(
          match.id,
        );
        await this.notify.notifyStakeResultsToBettors(stakes, match.title);
      } catch {
        // notify 실패는 silent
      }
    }
    return match;
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '내전 취소 (스테이크 환불)' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.cancelMatch(id);
  }
}
