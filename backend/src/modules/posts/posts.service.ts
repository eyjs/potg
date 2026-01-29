import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Post, PostType, PostVisibility } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { CreatePostDto, UpdatePostDto, CreateCommentDto } from './dto/post.dto';
import { Follow } from '../profiles/entities/follow.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(PostLike)
    private likeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private commentRepo: Repository<PostComment>,
    @InjectRepository(Follow)
    private followRepo: Repository<Follow>,
    private dataSource: DataSource,
  ) {}

  // ==================== 게시물 ====================

  async getFeed(
    clanId: string,
    viewerId: string,
    options: {
      authorId?: string;
      type?: PostType;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: Post[]; total: number }> {
    const { authorId, type, page = 1, limit = 20 } = options;

    const query = this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('author.user', 'user')
      .where('post.clanId = :clanId', { clanId })
      .orderBy('post.isPinned', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (authorId) {
      query.andWhere('post.authorId = :authorId', { authorId });
    }

    if (type) {
      query.andWhere('post.type = :type', { type });
    }

    // 공개 범위 필터링
    query.andWhere(`(
      post.visibility = 'PUBLIC'
      OR post.authorId = :viewerId
      OR (post.visibility = 'FOLLOWERS' AND EXISTS (
        SELECT 1 FROM follows f 
        WHERE f.followerId = :viewerId AND f.followingId = post.authorId
      ))
    )`, { viewerId });

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async getPost(id: string, viewerId: string): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author', 'author.user'],
    });

    if (!post) throw new NotFoundException('게시물을 찾을 수 없습니다.');

    // 공개 범위 확인
    if (post.visibility === PostVisibility.PRIVATE && post.authorId !== viewerId) {
      throw new ForbiddenException('비공개 게시물입니다.');
    }

    if (post.visibility === PostVisibility.FOLLOWERS) {
      const isFollowing = await this.followRepo.count({
        where: { followerId: viewerId, followingId: post.authorId },
      });
      if (!isFollowing && post.authorId !== viewerId) {
        throw new ForbiddenException('팔로워 전용 게시물입니다.');
      }
    }

    return post;
  }

  async createPost(authorId: string, clanId: string, dto: CreatePostDto): Promise<Post> {
    const post = this.postRepo.create({
      authorId,
      clanId,
      type: dto.type || PostType.TEXT,
      content: dto.content,
      media: dto.media,
      metadata: dto.metadata,
      visibility: dto.visibility || PostVisibility.PUBLIC,
    });
    return this.postRepo.save(post);
  }

  async updatePost(id: string, authorId: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.postRepo.findOne({ where: { id, authorId } });
    if (!post) throw new NotFoundException('게시물을 찾을 수 없거나 권한이 없습니다.');

    Object.assign(post, dto);
    return this.postRepo.save(post);
  }

  async deletePost(id: string, authorId: string): Promise<void> {
    const result = await this.postRepo.delete({ id, authorId });
    if (!result.affected) throw new NotFoundException('게시물을 찾을 수 없거나 권한이 없습니다.');
  }

  // ==================== 좋아요 ====================

  async like(postId: string, memberId: string): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시물을 찾을 수 없습니다.');

    await this.dataSource.transaction(async (manager) => {
      // PostgreSQL: INSERT ... ON CONFLICT DO NOTHING RETURNING id
      // 실제로 삽입된 경우에만 row가 반환됨
      const inserted = await manager.query(
        `INSERT INTO post_likes ("postId", "memberId")
         VALUES ($1, $2)
         ON CONFLICT ("postId", "memberId") DO NOTHING
         RETURNING id`,
        [postId, memberId],
      );

      // 실제로 삽입된 경우에만 카운트 증가
      if (inserted.length > 0) {
        await manager.increment(Post, { id: postId }, 'likeCount', 1);
      }
    });
  }

  async unlike(postId: string, memberId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.delete(PostLike, { postId, memberId });

      if (result.affected && result.affected > 0) {
        await manager.decrement(Post, { id: postId }, 'likeCount', 1);
      }
    });
  }

  async isLiked(postId: string, memberId: string): Promise<boolean> {
    const count = await this.likeRepo.count({ where: { postId, memberId } });
    return count > 0;
  }

  async getLikeStatusBulk(postIds: string[], memberId: string): Promise<Record<string, boolean>> {
    if (!postIds.length || !memberId) return {};

    const likes = await this.likeRepo.find({
      where: { postId: In(postIds), memberId },
      select: ['postId'],
    });

    const likedSet = new Set(likes.map((l) => l.postId));
    return postIds.reduce((acc, id) => {
      acc[id] = likedSet.has(id);
      return acc;
    }, {} as Record<string, boolean>);
  }

  // ==================== 댓글 ====================

  async getComments(postId: string, page = 1, limit = 20): Promise<{ data: PostComment[]; total: number }> {
    const [data, total] = await this.commentRepo.findAndCount({
      where: { postId, parentId: undefined },
      relations: ['author', 'author.user'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getReplies(commentId: string): Promise<PostComment[]> {
    return this.commentRepo.find({
      where: { parentId: commentId },
      relations: ['author', 'author.user'],
      order: { createdAt: 'ASC' },
    });
  }

  async createComment(postId: string, authorId: string, dto: CreateCommentDto): Promise<PostComment> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시물을 찾을 수 없습니다.');

    const comment = this.commentRepo.create({
      postId,
      authorId,
      content: dto.content,
      parentId: dto.parentId,
    });
    await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    return comment;
  }

  async deleteComment(id: string, authorId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id, authorId } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없거나 권한이 없습니다.');

    await this.commentRepo.delete(id);
    await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1);
  }
}
