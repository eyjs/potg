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
import { GamesService } from './games.service';
import { ProfilesService } from '../profiles/profiles.service';
import { SubmitScoreDto, CreateRoomDto, JoinRoomDto, UpdateRoomSettingsDto } from './dto/games.dto';
import { GameType } from './entities/game.entity';

@Controller('games')
@UseGuards(AuthGuard('jwt'))
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly profilesService: ProfilesService,
  ) {}

  // ==================== 게임 목록 ====================

  @Get()
  async getGames(@Query('type') type?: GameType) {
    return this.gamesService.getGames(type);
  }

  @Get(':code')
  async getGame(@Param('code') code: string) {
    return this.gamesService.getGame(code);
  }

  // ==================== 점수 & 리더보드 ====================

  @Post('score')
  async submitScore(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: SubmitScoreDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.gamesService.submitScore(memberId, clanId, dto);
  }

  @Get(':code/leaderboard')
  async getLeaderboard(
    @Param('code') code: string,
    @Query('clanId') clanId: string,
    @Query('period') period?: 'all' | 'daily' | 'weekly' | 'monthly',
    @Query('limit') limit = 100,
  ) {
    return this.gamesService.getLeaderboard(code, clanId, { period, limit: +limit });
  }

  @Get(':code/my-best')
  async getMyBestScore(
    @Param('code') code: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) return null;
    return this.gamesService.getMyBestScore(memberId, code);
  }

  // ==================== 방 관리 ====================

  @Get('rooms/public')
  async getPublicRooms(
    @Query('clanId') clanId: string,
    @Query('gameCode') gameCode?: string,
  ) {
    return this.gamesService.getPublicRooms(clanId, gameCode);
  }

  @Get('rooms/:roomId')
  async getRoom(@Param('roomId') roomId: string) {
    return this.gamesService.getRoom(roomId);
  }

  @Post('rooms')
  async createRoom(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: CreateRoomDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.gamesService.createRoom(memberId, clanId, dto);
  }

  @Post('rooms/join')
  async joinRoom(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: JoinRoomDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.gamesService.joinRoom(memberId, dto.roomCode);
  }

  @Delete('rooms/:roomId/leave')
  async leaveRoom(
    @Param('roomId') roomId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.gamesService.leaveRoom(memberId, roomId);
    return { success: true };
  }

  @Patch('rooms/:roomId')
  async updateRoomSettings(
    @Param('roomId') roomId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: UpdateRoomSettingsDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.gamesService.updateRoomSettings(roomId, memberId, dto);
  }

  @Post('rooms/:roomId/ready')
  async setReady(
    @Param('roomId') roomId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Query('ready') ready = 'true',
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    const result = await this.gamesService.setPlayerReady(memberId, roomId, ready === 'true');
    return { success: true, ...result };
  }

  @Post('rooms/:roomId/start')
  async startGame(
    @Param('roomId') roomId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.gamesService.startGame(roomId, memberId);
  }
}
