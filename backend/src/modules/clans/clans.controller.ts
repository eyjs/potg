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
import { ClansService } from './clans.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateClanDto } from './dto/create-clan.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ClanRole } from './entities/clan-member.entity';
import { HallOfFameType } from './entities/hall-of-fame.entity';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';
import { ClanRoles } from '../../common/decorators/clan-roles.decorator';

@Controller('clans')
export class ClansController {
  constructor(private readonly clansService: ClansService) {}

  // ========== 정적 라우트 (파라미터 라우트보다 먼저 선언) ==========

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

  @UseGuards(AuthGuard('jwt'))
  @Post('leave')
  leave(@Request() req: AuthenticatedRequest) {
    return this.clansService.leaveClan(req.user.userId);
  }

  // 내 클랜 멤버십 정보 조회
  @UseGuards(AuthGuard('jwt'))
  @Get('membership/me')
  getMyMembership(@Request() req: AuthenticatedRequest) {
    return this.clansService.getMyMembership(req.user.userId);
  }

  // 내 가입 신청 조회
  @UseGuards(AuthGuard('jwt'))
  @Get('requests/me')
  getMyRequest(@Request() req: AuthenticatedRequest) {
    return this.clansService.getMyPendingRequest(req.user.userId);
  }

  // 가입 신청 승인
  @UseGuards(AuthGuard('jwt'))
  @Post('requests/:requestId/approve')
  approveRequest(
    @Param('requestId') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.approveRequest(id, req.user.userId);
  }

  // 가입 신청 거절
  @UseGuards(AuthGuard('jwt'))
  @Post('requests/:requestId/reject')
  rejectRequest(
    @Param('requestId') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.rejectRequest(id, req.user.userId);
  }

  // 공지사항 수정 (정적 prefix)
  @UseGuards(AuthGuard('jwt'))
  @Patch('announcements/:announcementId')
  updateAnnouncement(
    @Param('announcementId') announcementId: string,
    @Body() data: { title?: string; content?: string; isPinned?: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.updateAnnouncement(announcementId, data, req.user.userId);
  }

  // 공지사항 삭제 (정적 prefix)
  @UseGuards(AuthGuard('jwt'))
  @Post('announcements/:announcementId/delete')
  deleteAnnouncement(
    @Param('announcementId') announcementId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.deleteAnnouncement(announcementId, req.user.userId);
  }

  // ========== 파라미터 라우트 (:id, :clanId) ==========

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clansService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  updateClan(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.updateClan(id, data, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  join(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('message') message?: string,
  ) {
    return this.clansService.requestJoin(id, req.user.userId, message);
  }

  // 클랜 가입 신청 목록 조회
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/requests')
  getClanRequests(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.getClanRequests(id, req.user.userId);
  }

  // 클랜 멤버 목록 조회
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.clansService.getMembers(id);
  }

  // 멤버 역할 변경 (마스터만)
  @UseGuards(AuthGuard('jwt'))
  @Patch(':clanId/members/:userId/role')
  updateMemberRole(
    @Param('clanId') clanId: string,
    @Param('userId') userId: string,
    @Body('role') role: ClanRole,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.updateMemberRole(clanId, userId, role, req.user.userId);
  }

  // 멤버 추방 (마스터/운영진)
  @UseGuards(AuthGuard('jwt'))
  @Post(':clanId/members/:userId/kick')
  kickMember(
    @Param('clanId') clanId: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.kickMember(clanId, userId, req.user.userId);
  }

  // 마스터 권한 양도
  @UseGuards(AuthGuard('jwt'))
  @Post(':clanId/transfer-master')
  transferMaster(
    @Param('clanId') clanId: string,
    @Body('newMasterId') newMasterId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.transferMaster(clanId, newMasterId, req.user.userId);
  }

  // ========== 활동 피드 API ==========

  @UseGuards(AuthGuard('jwt'))
  @Get(':clanId/activities')
  getActivities(
    @Param('clanId') clanId: string,
    @Query() query: ActivityQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.getActivities(clanId, req.user.userId, query.limit);
  }

  // ========== 공지사항 API ==========

  @Get(':clanId/announcements')
  getAnnouncements(@Param('clanId') clanId: string) {
    return this.clansService.getAnnouncements(clanId);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post(':clanId/announcements')
  createAnnouncement(
    @Param('clanId') clanId: string,
    @Body() data: { title: string; content: string; isPinned?: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clansService.createAnnouncement(clanId, req.user.userId, data);
  }

  // ========== 명예의전당/기부자/현상수배 API ==========

  @Get(':clanId/hall-of-fame')
  getHallOfFame(
    @Param('clanId') clanId: string,
    @Query('type') type?: HallOfFameType,
  ) {
    return this.clansService.getHallOfFame(clanId, type);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post(':clanId/hall-of-fame')
  createHallOfFameEntry(
    @Param('clanId') clanId: string,
    @Body()
    data: {
      type: HallOfFameType;
      title: string;
      description?: string;
      userId?: string;
      amount?: number;
      imageUrl?: string;
    },
  ) {
    return this.clansService.createHallOfFameEntry(clanId, data);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Patch(':clanId/hall-of-fame/:entryId')
  updateHallOfFameEntry(
    @Param('clanId') clanId: string,
    @Param('entryId') entryId: string,
    @Body()
    data: {
      title?: string;
      description?: string;
      userId?: string;
      amount?: number;
      imageUrl?: string;
      displayOrder?: number;
    },
  ) {
    return this.clansService.updateHallOfFameEntry(entryId, data);
  }

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post(':clanId/hall-of-fame/:entryId/delete')
  deleteHallOfFameEntry(
    @Param('clanId') clanId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.clansService.deleteHallOfFameEntry(entryId);
  }
}
