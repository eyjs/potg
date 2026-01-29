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
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, CreateCommentDto } from './dto/post.dto';
import { PostType } from './entities/post.entity';
import { ProfilesService } from '../profiles/profiles.service';

@Controller('posts')
@UseGuards(AuthGuard('jwt'))
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly profilesService: ProfilesService,
  ) {}

  // ==================== 피드 ====================

  @Get()
  async getFeed(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Query('authorId') authorId?: string,
    @Query('type') type?: PostType,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    return this.postsService.getFeed(clanId, memberId || '', {
      authorId,
      type,
      page: +page,
      limit: +limit,
    });
  }

  // 벌크 API는 :id 라우트보다 먼저 선언해야 함
  @Get('bulk/like-status')
  async getLikeStatusBulk(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Query('postIds') postIds: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) return { likeStatus: {} };

    const ids = postIds.split(',').filter(Boolean);
    const likeStatus = await this.postsService.getLikeStatusBulk(ids, memberId);
    return { likeStatus };
  }

  @Get(':id')
  async getPost(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId?: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    return this.postsService.getPost(id, memberId || '');
  }

  @Post()
  async createPost(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: CreatePostDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.postsService.createPost(memberId, clanId, dto);
  }

  @Patch(':id')
  async updatePost(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: UpdatePostDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.postsService.updatePost(id, memberId, dto);
  }

  @Delete(':id')
  async deletePost(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.postsService.deletePost(id, memberId);
    return { success: true };
  }

  // ==================== 좋아요 ====================

  @Post(':id/like')
  async like(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.postsService.like(id, memberId);
    return { success: true };
  }

  @Delete(':id/like')
  async unlike(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.postsService.unlike(id, memberId);
    return { success: true };
  }

  @Get(':id/like-status')
  async getLikeStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId?: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) return { isLiked: false };
    const isLiked = await this.postsService.isLiked(id, memberId);
    return { isLiked };
  }

  // ==================== 댓글 ====================

  @Get(':id/comments')
  async getComments(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.postsService.getComments(id, +page, +limit);
  }

  @Get('comments/:commentId/replies')
  async getReplies(@Param('commentId') commentId: string) {
    return this.postsService.getReplies(commentId);
  }

  @Post(':id/comments')
  async createComment(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.postsService.createComment(id, memberId, dto);
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const memberId = await this.profilesService.getMemberIdByUserId(req.user.userId, clanId);
    if (!memberId) throw new BadRequestException('클랜 멤버가 아닙니다.');
    await this.postsService.deleteComment(commentId, memberId);
    return { success: true };
  }
}
