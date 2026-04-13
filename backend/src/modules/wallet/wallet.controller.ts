import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AuthGuard } from '@nestjs/passport';
import { SendPointDto } from './dto/send-point.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ==================== 비인증 엔드포인트 ====================

  @Get('ranking/activity')
  getActivityRanking(
    @Query('clanId') clanId: string,
    @Query('limit') limit = 20,
  ) {
    return this.walletService.getActivityRanking(clanId, +limit);
  }

  @Get('ranking/scrim')
  getScrimRanking(
    @Query('clanId') clanId: string,
    @Query('limit') limit = 20,
  ) {
    return this.walletService.getScrimRanking(clanId, +limit);
  }

  // ==================== 인증 엔드포인트 ====================

  @UseGuards(AuthGuard('jwt'))
  @Post('send')
  sendPoints(
    @Request() req: AuthenticatedRequest,
    @Body() sendDto: SendPointDto,
  ) {
    return this.walletService.sendPoints(req.user.userId, sendDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    return this.walletService.getHistory(req.user.userId, clanId);
  }
}
