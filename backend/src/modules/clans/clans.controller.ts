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
import { ClansService } from './clans.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateClanDto } from './dto/create-clan.dto';
import { ClanRole } from './entities/clan-member.entity';
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

    join(@Param('id') id: string, @Request() req: AuthenticatedRequest, @Body('message') message?: string) {

      // Now creates a request instead of direct join

      return this.clansService.requestJoin(id, req.user.userId, message);

    }

  

      @UseGuards(AuthGuard('jwt'))

  

      @Get('requests/me')

  

      getMyRequest(@Request() req: AuthenticatedRequest) {

  

        return this.clansService.getMyPendingRequest(req.user.userId);

  

      }

  

    

  

      @UseGuards(AuthGuard('jwt'))

  

      @Get(':id/requests')

  

      getClanRequests(@Param('id') id: string) {

  

        return this.clansService.getClanRequests(id);

  

      }

  

    

  

      @UseGuards(AuthGuard('jwt'))

  

      @Post('requests/:requestId/approve')

  

      approveRequest(@Param('requestId') id: string, @Request() req: AuthenticatedRequest) {

  

        return this.clansService.approveRequest(id, req.user.userId);

  

      }

  

    

  

      @UseGuards(AuthGuard('jwt'))

  

      @Post('requests/:requestId/reject')

  

      rejectRequest(@Param('requestId') id: string) {

  

        return this.clansService.rejectRequest(id);

  

      }

  

    

  

      @UseGuards(AuthGuard('jwt'))

  

      @Post('leave')

  

    

   // Using POST for action, or DELETE if preferred. Let's stick to POST for 'leave action' or DELETE on resource.
  // Actually DELETE /clans/membership makes sense, but context is user's membership.
  // Let's use DELETE /clans/leave for simplicity
  leave(@Request() req: AuthenticatedRequest) {
    return this.clansService.leaveClan(req.user.userId);
  }

  // 내 클랜 멤버십 정보 조회
  @UseGuards(AuthGuard('jwt'))
  @Get('membership/me')
  getMyMembership(@Request() req: AuthenticatedRequest) {
    return this.clansService.getMyMembership(req.user.userId);
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
}
