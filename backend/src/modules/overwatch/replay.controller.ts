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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ReplayService } from './replay.service';
import {
  CreateReplayDto,
  UpdateReplayDto,
  GetReplaysQueryDto,
} from './dto/overwatch.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('replays')
@UseGuards(AuthGuard('jwt'))
export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  /** 리플레이 생성 (단일 클랜) */
  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateReplayDto) {
    return this.replayService.create(req.user.userId, dto);
  }

  /** 리플레이 목록 조회 */
  @Get()
  findAll(@Query() query: GetReplaysQueryDto) {
    return this.replayService.findAll(query);
  }

  /** 내 리플레이 목록 */
  @Get('mine')
  findMyReplays(@Request() req: AuthenticatedRequest) {
    return this.replayService.findByUser(req.user.userId);
  }

  /** 통계 */
  @Get('stats')
  getStats() {
    return this.replayService.getStats();
  }

  /** 리플레이 상세 조회 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.replayService.findOne(id);
  }

  /** 리플레이 수정 */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateReplayDto,
  ) {
    return this.replayService.update(id, req.user.userId, dto);
  }

  /** 리플레이 삭제 */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.replayService.remove(id, req.user.userId);
  }

  /** 좋아요 토글 (1분 10회 제한) */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/like')
  toggleLike(@Param('id') id: string) {
    return this.replayService.toggleLike(id);
  }
}
