import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';
import { CreatePointRuleDto, UpdatePointRuleDto } from './dto/point-rule.dto';
import { AttendanceQueryDto } from './dto/attendance.dto';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';
import { ClanRoles } from '../../common/decorators/clan-roles.decorator';
import { ClanRole } from '../clans/entities/clan-member.entity';

@Controller('clans/:clanId')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ========== PointRule CRUD ==========

  @UseGuards(AuthGuard('jwt'))
  @Get('point-rules')
  findRules(@Param('clanId') clanId: string) {
    return this.attendanceService.findRules(clanId);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post('point-rules')
  createRule(
    @Param('clanId') clanId: string,
    @Body() dto: CreatePointRuleDto,
  ) {
    return this.attendanceService.createRule(clanId, dto);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Patch('point-rules/:id')
  updateRule(
    @Param('clanId') clanId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePointRuleDto,
  ) {
    return this.attendanceService.updateRule(clanId, id, dto);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Delete('point-rules/:id')
  deleteRule(
    @Param('clanId') clanId: string,
    @Param('id') id: string,
  ) {
    return this.attendanceService.deleteRule(clanId, id);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post('point-rules/seed')
  seedDefaultRules(@Param('clanId') clanId: string) {
    return this.attendanceService.seedDefaultRules(clanId);
  }

  // ========== Attendance ==========

  @UseGuards(AuthGuard('jwt'))
  @Get('attendance')
  getAttendanceHistory(
    @Param('clanId') clanId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getAttendanceHistory(
      clanId,
      query.limit,
      query.offset,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('attendance/stats')
  getAttendanceStats(@Param('clanId') clanId: string) {
    return this.attendanceService.getAttendanceStats(clanId);
  }
}
