import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ScrimResultsService } from './scrim-results.service';
import { CreateScrimResultDto } from './dto/create-scrim-result.dto';
import { UpdateScrimResultDto } from './dto/update-scrim-result.dto';

@Controller('scrim-results')
export class ScrimResultsController {
  constructor(private readonly scrimResultsService: ScrimResultsService) {}

  // ==================== 비인증 엔드포인트 ====================

  @Get('auction/:auctionId')
  async findByAuctionId(@Param('auctionId') auctionId: string) {
    return this.scrimResultsService.findByAuctionId(auctionId);
  }

  @Get('ranking')
  async getRanking(
    @Query('clanId') clanId: string,
    @Query('limit') limit = 20,
  ) {
    return this.scrimResultsService.getRanking(clanId, +limit);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.scrimResultsService.findById(id);
  }

  // ==================== 관리자 엔드포인트 ====================

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateScrimResultDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scrimResultsService.create(dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScrimResultDto,
  ) {
    return this.scrimResultsService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scrimResultsService.confirm(id, req.user.userId);
  }
}
