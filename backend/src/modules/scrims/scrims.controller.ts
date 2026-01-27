import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ScrimsService } from './scrims.service';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateScrimDto,
  UpdateScrimDto,
  AddParticipantDto,
  UpdateMatchDto,
} from './dto/scrim.dto';
import { AssignedTeam } from './entities/scrim-participant.entity';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('scrims')
export class ScrimsController {
  constructor(private readonly scrimsService: ScrimsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createScrimDto: CreateScrimDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scrimsService.create(createScrimDto, req.user.userId);
  }

  @Get()
  findAll(
    @Query('clanId') clanId: string,
    @Query('today') today?: string,
  ) {
    return this.scrimsService.findAll(clanId, today === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scrimsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateScrimDto: UpdateScrimDto) {
    return this.scrimsService.update(id, updateScrimDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/participants')
  addParticipant(@Param('id') scrimId: string, @Body() dto: AddParticipantDto) {
    return this.scrimsService.addParticipant(scrimId, dto.userId, dto.source);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/participants/:userId/team')
  assignTeam(
    @Param('id') scrimId: string,
    @Param('userId') userId: string,
    @Body('team') team: AssignedTeam,
  ) {
    return this.scrimsService.assignTeam(scrimId, userId, team);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/participants/:userId')
  removeParticipant(
    @Param('id') scrimId: string,
    @Param('userId') userId: string,
  ) {
    return this.scrimsService.removeParticipant(scrimId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  joinScrim(
    @Param('id') scrimId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scrimsService.joinScrim(scrimId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/leave')
  leaveScrim(
    @Param('id') scrimId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.scrimsService.leaveScrim(scrimId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/import-auction')
  importFromAuction(@Param('id') scrimId: string) {
    return this.scrimsService.importAuctionParticipants(scrimId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/shuffle-teams')
  shuffleTeams(@Param('id') scrimId: string) {
    return this.scrimsService.shuffleTeams(scrimId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/matches')
  updateMatchCount(
    @Param('id') scrimId: string,
    @Body('count') count: number,
  ) {
    return this.scrimsService.updateMatchCount(scrimId, count);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/matches/:matchId')
  updateMatch(
    @Param('id') scrimId: string,
    @Param('matchId') matchId: string,
    @Body() updateData: UpdateMatchDto,
  ) {
    return this.scrimsService.updateMatch(matchId, updateData);
  }
}
