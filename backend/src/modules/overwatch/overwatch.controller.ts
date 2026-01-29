import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { OverwatchService } from './overwatch.service';
import { OverwatchApiService } from './overwatch-api.service';
import { UpdateSyncSettingsDto, GetStatsHistoryDto } from './dto/overwatch.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('overwatch')
export class OverwatchController {
  constructor(
    private readonly overwatchService: OverwatchService,
    private readonly overwatchApiService: OverwatchApiService,
  ) {}

  /**
   * 내 오버워치 프로필 조회
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('profile/me')
  getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.overwatchService.getProfile(req.user.userId);
  }

  /**
   * 특정 유저 오버워치 프로필 조회
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('profile/:userId')
  getProfile(@Param('userId') userId: string) {
    return this.overwatchService.getProfile(userId);
  }

  /**
   * 내 프로필 수동 동기화
   * Rate limit: 1분에 최대 3회
   */
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('profile/me/sync')
  syncMyProfile(@Request() req: AuthenticatedRequest) {
    return this.overwatchService.syncProfile(req.user.userId);
  }

  /**
   * 경쟁전 정보 조회
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('competitive/:userId')
  getCompetitive(@Param('userId') userId: string) {
    return this.overwatchService.getCompetitiveInfo(userId);
  }

  /**
   * 영웅 통계 조회
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('stats/:userId/heroes')
  getHeroStats(@Param('userId') userId: string) {
    return this.overwatchService.getHeroStats(userId);
  }

  /**
   * 통계 히스토리 조회
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('stats/:userId/history')
  getStatsHistory(
    @Param('userId') userId: string,
    @Query() query: GetStatsHistoryDto,
  ) {
    return this.overwatchService.getSnapshots(userId, query.limit ?? 30);
  }

  /**
   * 클랜원 랭킹 조회
   * 본인이 속한 클랜만 조회 가능
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('rankings/:clanId')
  getClanRankings(
    @Param('clanId') clanId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.clanId !== clanId) {
      throw new ForbiddenException('해당 클랜의 랭킹을 볼 권한이 없습니다.');
    }
    return this.overwatchService.getClanRankings(clanId);
  }

  /**
   * 동기화 설정 변경
   */
  @UseGuards(AuthGuard('jwt'))
  @Patch('profile/me/settings')
  updateSyncSettings(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateSyncSettingsDto,
  ) {
    return this.overwatchService.updateSyncSettings(
      req.user.userId,
      dto.autoSync ?? true,
    );
  }

  // ============================================
  // 게임 데이터 API (Public - 인증 불필요)
  // ============================================

  /**
   * 영웅 목록 조회
   */
  @Get('heroes')
  getHeroes(@Query('locale') locale?: string) {
    return this.overwatchApiService.getHeroes(locale || 'ko-kr');
  }

  /**
   * 영웅 상세 정보 조회
   */
  @Get('heroes/:heroKey')
  getHeroDetail(
    @Param('heroKey') heroKey: string,
    @Query('locale') locale?: string,
  ) {
    return this.overwatchApiService.getHeroDetail(heroKey, locale || 'ko-kr');
  }

  /**
   * 맵 목록 조회
   */
  @Get('maps')
  getMaps(@Query('locale') locale?: string) {
    return this.overwatchApiService.getMaps(locale || 'ko-kr');
  }

  /**
   * 게임모드 목록 조회
   */
  @Get('gamemodes')
  getGamemodes(@Query('locale') locale?: string) {
    return this.overwatchApiService.getGamemodes(locale || 'ko-kr');
  }

  /**
   * 역할 목록 조회
   */
  @Get('roles')
  getRoles(@Query('locale') locale?: string) {
    return this.overwatchApiService.getRoles(locale || 'ko-kr');
  }
}
