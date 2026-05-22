import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BettingService } from './betting.service';
import {
  CreateMarketDto,
  PlaceStakeDto,
  SettleMarketDto,
} from './dto/betting.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

/**
 * 패리뮤추얼 베팅 HTTP API.
 *
 * 사용자 채널(잔액 조회/베팅)은 Phase 3 디스코드 봇이 메인이고,
 * 본 컨트롤러는 관리자 웹(매니지먼트)과 통합 테스트용 진입점으로 사용한다.
 */
@Controller('betting')
export class BettingController {
  constructor(private readonly bettingService: BettingService) {}

  // ==================== 관리자 ====================

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('markets')
  createMarket(@Body() dto: CreateMarketDto) {
    return this.bettingService.createMarket(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('markets/:id/lock')
  lockMarket(@Param('id') id: string) {
    return this.bettingService.lockMarket(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('markets/:id/settle')
  settleMarket(@Param('id') id: string, @Body() dto: SettleMarketDto) {
    return this.bettingService.settleMarket(id, dto.winningOption);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('markets/:id/cancel')
  cancelMarket(@Param('id') id: string) {
    return this.bettingService.cancelMarket(id);
  }

  // ==================== 사용자 (베팅) ====================

  @UseGuards(AuthGuard('jwt'))
  @Post('markets/:id/stake')
  placeStake(
    @Param('id') marketId: string,
    @Body() dto: PlaceStakeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bettingService.placeStake(marketId, req.user.userId, dto);
  }

  // ==================== 조회 ====================

  @Get('matches/:matchId/markets')
  findMarketsByMatch(@Param('matchId') matchId: string) {
    return this.bettingService.findMarketsByMatch(matchId);
  }

  @Get('markets/:id')
  findMarket(@Param('id') id: string) {
    return this.bettingService.findMarketById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-stakes')
  findMyStakes(@Request() req: AuthenticatedRequest) {
    return this.bettingService.findMyStakes(req.user.userId);
  }

  @Get('markets/:id/stakes')
  findStakesByMarket(@Param('id') id: string) {
    return this.bettingService.findStakesByMarket(id);
  }
}
