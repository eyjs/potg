import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';
import { SendPointDto } from './dto/send-point.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('ranking/activity')
  getActivityRanking(@Query('limit') limit = 20) {
    return this.walletService.getActivityRanking(+limit);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  getBalance(@Request() req: AuthenticatedRequest) {
    return this.walletService.getBalance(req.user.userId);
  }

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
    @Query('limit') limit = 100,
  ) {
    return this.walletService.getHistory(req.user.userId, +limit);
  }
}
