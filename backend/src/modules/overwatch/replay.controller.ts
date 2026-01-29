import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ReplayService } from './replay.service';
import { CreateReplayDto, UpdateReplayDto, GetReplaysQueryDto } from './dto/overwatch.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('replays')
@UseGuards(AuthGuard('jwt'))
export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  /**
   * 리플레이 생성
   */
  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateReplayDto) {
    if (!req.user.clanId) {
      throw new BadRequestException('클랜에 가입해야 리플레이를 등록할 수 있습니다.');
    }
    return this.replayService.create(req.user.userId, req.user.clanId, dto);
  }

  /**
   * 클랜 리플레이 목록 조회
   * 본인이 속한 클랜만 조회 가능
   */
  @Get('clan/:clanId')
  findByClan(
    @Param('clanId') clanId: string,
    @Query() query: GetReplaysQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.clanId !== clanId) {
      throw new ForbiddenException('해당 클랜의 리플레이를 볼 권한이 없습니다.');
    }
    return this.replayService.findByClan(clanId, query);
  }

  /**
   * 내 클랜 리플레이 목록 조회
   */
  @Get('my-clan')
  findMyClanReplays(@Request() req: AuthenticatedRequest, @Query() query: GetReplaysQueryDto) {
    if (!req.user.clanId) {
      throw new BadRequestException('클랜에 가입되어 있지 않습니다.');
    }
    return this.replayService.findByClan(req.user.clanId, query);
  }

  /**
   * 내 리플레이 목록 조회
   */
  @Get('mine')
  findMyReplays(@Request() req: AuthenticatedRequest) {
    return this.replayService.findByUser(req.user.userId);
  }

  /**
   * 클랜 통계
   * 본인이 속한 클랜만 조회 가능
   */
  @Get('stats/:clanId')
  getClanStats(
    @Param('clanId') clanId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.clanId !== clanId) {
      throw new ForbiddenException('해당 클랜의 통계를 볼 권한이 없습니다.');
    }
    return this.replayService.getClanStats(clanId);
  }

  /**
   * 리플레이 상세 조회
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.replayService.findOne(id);
  }

  /**
   * 리플레이 수정
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateReplayDto,
  ) {
    return this.replayService.update(id, req.user.userId, dto);
  }

  /**
   * 리플레이 삭제
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.replayService.remove(id, req.user.userId);
  }

  /**
   * 좋아요 토글
   * Rate limit: 1분에 10회
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/like')
  toggleLike(@Param('id') id: string) {
    return this.replayService.toggleLike(id);
  }
}
