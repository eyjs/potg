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
@UseGuards(AuthGuard('jwt'))
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('send')
  sendPoints(
    @Request() req: AuthenticatedRequest,
    @Body() sendDto: SendPointDto,
  ) {
    return this.walletService.sendPoints(req.user.userId, sendDto);
  }

  @Get('history')
  getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    return this.walletService.getHistory(req.user.userId, clanId);
  }
}
