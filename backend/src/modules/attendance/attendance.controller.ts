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

/**
 * `clans/:clanId` URL 경로는 historical resource path로 유지하되,
 * 단일 클랜 전환 후 :clanId 파라미터는 사용하지 않는다.
 */
@Controller('clans/:clanId')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ========== PointRule CRUD ==========

  @UseGuards(AuthGuard('jwt'))
  @Get('point-rules')
  findRules() {
    return this.attendanceService.findRules();
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post('point-rules')
  createRule(@Body() dto: CreatePointRuleDto) {
    return this.attendanceService.createRule(dto);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Patch('point-rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdatePointRuleDto) {
    return this.attendanceService.updateRule(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Delete('point-rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.attendanceService.deleteRule(id);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post('point-rules/seed')
  seedDefaultRules() {
    return this.attendanceService.seedDefaultRules();
  }

  // ========== Attendance ==========

  @UseGuards(AuthGuard('jwt'))
  @Get('attendance')
  getAttendanceHistory(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.getAttendanceHistory(
      query.limit,
      query.offset,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('attendance/stats')
  getAttendanceStats() {
    return this.attendanceService.getAttendanceStats();
  }
}
