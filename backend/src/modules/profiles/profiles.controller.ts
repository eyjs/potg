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
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto, EquipItemsDto, CreateGuestbookDto } from './dto/profile.dto';

@Controller('profiles')
@UseGuards(AuthGuard('jwt'))
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ==================== 프로필 ====================

  @Get(':memberId')
  async getProfile(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId?: string,
  ) {
    const viewerMemberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    return this.profilesService.getProfile(memberId, viewerMemberId || undefined);
  }

  @Patch('me')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.profilesService.updateProfile(memberId, dto);
  }

  @Post('me/equip')
  async equipItems(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: EquipItemsDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.profilesService.equipItems(memberId, dto);
  }

  // ==================== 팔로우 ====================

  @Get(':memberId/followers')
  async getFollowers(
    @Param('memberId') memberId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.profilesService.getFollowers(memberId, +page, +limit);
  }

  @Get(':memberId/following')
  async getFollowing(
    @Param('memberId') memberId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.profilesService.getFollowing(memberId, +page, +limit);
  }

  @Get(':memberId/follow-status')
  async getFollowStatus(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId?: string,
  ) {
    const myMemberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!myMemberId) return { isFollowing: false };
    const isFollowing = await this.profilesService.isFollowing(myMemberId, memberId);
    return { isFollowing };
  }

  @Post(':memberId/follow')
  async follow(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const myMemberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!myMemberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.profilesService.follow(myMemberId, memberId);
    return { success: true };
  }

  @Delete(':memberId/follow')
  async unfollow(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const myMemberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!myMemberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.profilesService.unfollow(myMemberId, memberId);
    return { success: true };
  }

  // ==================== 방명록 ====================

  @Get(':memberId/guestbook')
  async getGuestbook(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const profile = await this.profilesService.getProfile(memberId);
    const viewerMemberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    return this.profilesService.getGuestbook(profile.id, viewerMemberId || undefined, +page, +limit);
  }

  @Post(':memberId/guestbook')
  async createGuestbook(
    @Param('memberId') memberId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: CreateGuestbookDto,
  ) {
    const profile = await this.profilesService.getProfile(memberId);
    const myMemberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!myMemberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.profilesService.createGuestbook(profile.id, myMemberId, dto);
  }

  @Delete('guestbook/:id')
  async deleteGuestbook(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const myMemberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!myMemberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.profilesService.deleteGuestbook(id, myMemberId);
    return { success: true };
  }

  // ==================== 방문자 ====================

  @Get(':memberId/visitors')
  async getVisitors(
    @Param('memberId') memberId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const profile = await this.profilesService.getProfile(memberId);
    return this.profilesService.getVisitors(profile.id, +page, +limit);
  }
}
