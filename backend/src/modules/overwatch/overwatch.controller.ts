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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OverwatchService } from './overwatch.service';
import { UpdateSyncSettingsDto } from './dto/overwatch.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('overwatch')
export class OverwatchController {
  constructor(private readonly overwatchService: OverwatchService) {}

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
   */
  @UseGuards(AuthGuard('jwt'))
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
    @Query('limit') limit?: number,
  ) {
    return this.overwatchService.getSnapshots(userId, limit || 30);
  }

  /**
   * 클랜원 랭킹 조회
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('rankings/:clanId')
  getClanRankings(@Param('clanId') clanId: string) {
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
}
