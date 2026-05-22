import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MatchService } from './match.service';
import {
  CreateMatchDto,
  CreateTeamDto,
  SettleMatchDto,
} from './dto/match.dto';

@Controller('admin/matches')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class MatchController {
  constructor(private readonly matches: MatchService) {}

  @Get()
  list() {
    return this.matches.findAll();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.findOneWithTeams(id);
  }

  @Post()
  create(@Body() dto: CreateMatchDto) {
    return this.matches.create({
      title: dto.title,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      description: dto.description ?? null,
    });
  }

  @Post(':id/teams')
  createTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.matches.createTeam(id, dto.name, dto.captainId);
  }

  @Post(':id/open')
  openBetting(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.openBetting(id);
  }

  @Post(':id/lock')
  lock(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.lockMatch(id);
  }

  @Post(':id/settle')
  settle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleMatchDto,
  ) {
    return this.matches.settleMatch(id, dto.winnerTeamId, dto.placements);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.cancelMatch(id);
  }
}
