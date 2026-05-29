import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuctionsAdminService } from './services/auctions-admin.service';
import { AuctionPayoutDto } from './dto/create-auction.dto';

/**
 * 경매 이력 + 참가자 보상 지급 (관리자 전용).
 */
@ApiTags('admin-auctions')
@ApiCookieAuth('access_token')
@Controller('admin/auctions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuctionsController {
  constructor(private readonly adminAuctions: AuctionsAdminService) {}

  @Get()
  @ApiOperation({ summary: '완료된 경매 이력 목록' })
  list() {
    return this.adminAuctions.listCompleted();
  }

  @Get(':id')
  @ApiOperation({ summary: '경매 이력 상세 (팀 영입 + 지급 여부)' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminAuctions.detail(id);
  }

  @Post(':id/payout')
  @ApiOperation({ summary: '전체 참가자에게 정액 보상 지급 (멱등)' })
  payout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AuctionPayoutDto,
  ) {
    return this.adminAuctions.payoutParticipants(id, dto.amountPerUser);
  }
}
