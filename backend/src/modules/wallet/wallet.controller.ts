import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('ranking/activity')
  @ApiOperation({ summary: '활동 포인트 랭킹 (상위 N)' })
  getActivityRanking(@Query('limit') limit = 20) {
    return this.walletService.getActivityRanking(+limit);
  }
}
