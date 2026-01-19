import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateAuctionDto, JoinAuctionDto, BidDto } from './dto/create-auction.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createAuctionDto: CreateAuctionDto, @Request() req: AuthenticatedRequest) {
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
  join(@Param('id') id: string, @Body() joinDto: JoinAuctionDto, @Request() req: AuthenticatedRequest) {
      return this.auctionsService.join(id, req.user.userId, joinDto.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/bid')
  bid(@Param('id') id: string, @Body() bidDto: BidDto, @Request() req: AuthenticatedRequest) {
      return this.auctionsService.placeBid(id, req.user.userId, bidDto.targetPlayerId, bidDto.amount);
  }
}
