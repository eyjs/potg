import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClansService } from './clans.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateClanDto } from './dto/create-clan.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('clans')
export class ClansController {
  constructor(private readonly clansService: ClansService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createClanDto: CreateClanDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.create(createClanDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.clansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clansService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  join(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.clansService.addMember(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('leave') // Using POST for action, or DELETE if preferred. Let's stick to POST for 'leave action' or DELETE on resource.
  // Actually DELETE /clans/membership makes sense, but context is user's membership.
  // Let's use DELETE /clans/leave for simplicity
  leave(@Request() req: AuthenticatedRequest) {
    return this.clansService.leaveClan(req.user.userId);
  }
}
