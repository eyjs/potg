import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { Follow } from '../profiles/entities/follow.entity';

describe('PostsService - Bulk Like Status', () => {
  let service: PostsService;
  let likeRepo: jest.Mocked<Repository<PostLike>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getRepositoryToken(Post),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PostLike),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PostComment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    likeRepo = module.get(getRepositoryToken(PostLike));
  });

  describe('getLikeStatusBulk', () => {
    it('빈 배열이면 빈 객체를 반환해야 함', async () => {
      const result = await service.getLikeStatusBulk([], 'member-1');

      expect(result).toEqual({});
      expect(likeRepo.find).not.toHaveBeenCalled();
    });

    it('memberId가 없으면 빈 객체를 반환해야 함', async () => {
      const result = await service.getLikeStatusBulk(['post-1', 'post-2'], '');

      expect(result).toEqual({});
    });

    it('좋아요한 게시물만 true로 반환해야 함', async () => {
      likeRepo.find.mockResolvedValue([
        { postId: 'post-1' } as PostLike,
        { postId: 'post-3' } as PostLike,
      ]);

      const result = await service.getLikeStatusBulk(
        ['post-1', 'post-2', 'post-3'],
        'member-1',
      );

      expect(result).toEqual({
        'post-1': true,
        'post-2': false,
        'post-3': true,
      });
    });

    it('모든 게시물을 좋아요하지 않았으면 모두 false', async () => {
      likeRepo.find.mockResolvedValue([]);

      const result = await service.getLikeStatusBulk(
        ['post-1', 'post-2'],
        'member-1',
      );

      expect(result).toEqual({
        'post-1': false,
        'post-2': false,
      });
    });

    it('모든 게시물을 좋아요했으면 모두 true', async () => {
      likeRepo.find.mockResolvedValue([
        { postId: 'post-1' } as PostLike,
        { postId: 'post-2' } as PostLike,
      ]);

      const result = await service.getLikeStatusBulk(
        ['post-1', 'post-2'],
        'member-1',
      );

      expect(result).toEqual({
        'post-1': true,
        'post-2': true,
      });
    });

    it('올바른 쿼리로 호출해야 함', async () => {
      likeRepo.find.mockResolvedValue([]);

      await service.getLikeStatusBulk(['post-1', 'post-2'], 'member-1');

      expect(likeRepo.find).toHaveBeenCalledWith({
        where: { postId: In(['post-1', 'post-2']), memberId: 'member-1' },
        select: ['postId'],
      });
    });
  });

  describe('isLiked', () => {
    it('좋아요했으면 true 반환', async () => {
      likeRepo.count.mockResolvedValue(1);

      const result = await service.isLiked('post-1', 'member-1');

      expect(result).toBe(true);
    });

    it('좋아요하지 않았으면 false 반환', async () => {
      likeRepo.count.mockResolvedValue(0);

      const result = await service.isLiked('post-1', 'member-1');

      expect(result).toBe(false);
    });
  });
});
