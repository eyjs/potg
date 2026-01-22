import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateAuctionDto,
  JoinAuctionDto,
  BidDto,
} from './dto/create-auction.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createAuctionDto: CreateAuctionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.create(createAuctionDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.auctionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auctionsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  join(
    @Param('id') id: string,
    @Body() joinDto: JoinAuctionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.join(id, req.user.userId, joinDto.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/bid')
  bid(
    @Param('id') id: string,
    @Body() bidDto: BidDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.placeBid(
      id,
      req.user.userId,
      bidDto.targetPlayerId,
      bidDto.amount,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/start')
  start(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.auctionsService.start(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/select-player')
  selectPlayer(
    @Param('id') id: string,
    @Body('playerId') playerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.selectPlayer(id, req.user.userId, playerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/complete')
  complete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.auctionsService.complete(id, req.user.userId);
  }

  // ========== 경매 마스터 기능 ==========

  // 매물 등록 (클랜원을 경매에 추가)
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/players')
  addPlayer(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.addPlayer(id, req.user.userId, userId);
  }

  // 매물 일괄 등록
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/players/bulk')
  addPlayers(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.addPlayers(id, req.user.userId, userIds);
  }

  // 참가자 제거
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/participants/:userId/remove')
  removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.removeParticipant(id, req.user.userId, userId);
  }

  // 팀장 추가
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/captains')
  addCaptain(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.addCaptain(id, req.user.userId, userId);
  }

  // 팀장 제거
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/captains/:userId/remove')
  removeCaptain(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.removeCaptain(id, req.user.userId, userId);
  }

  // 경매 설정 업데이트
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/settings')
  updateSettings(
    @Param('id') id: string,
    @Body() settings: { teamCount?: number; startingPoints?: number; turnTimeLimit?: number },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.updateAuctionSettings(id, req.user.userId, settings);
  }

  // 경매 삭제
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/delete')
  deleteAuction(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.auctionsService.deleteAuction(id, req.user.userId);
  }
}
