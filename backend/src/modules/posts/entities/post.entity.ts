import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';

export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  CLIP = 'CLIP',
  SCRIM_RESULT = 'SCRIM_RESULT',
  ACHIEVEMENT = 'ACHIEVEMENT',
  GAME_RESULT = 'GAME_RESULT',
  BALANCE_GAME = 'BALANCE_GAME',
}

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

@Entity('posts')
export class Post extends BaseEntity {
  @Column()
  @Index()
  authorId: string; // ClanMember.id

  @Column()
  @Index()
  clanId: string;

  @Column({ type: 'enum', enum: PostType, default: PostType.TEXT })
  type: PostType;

  @Column({ type: 'text', nullable: true })
  content: string; // 텍스트 내용

  @Column({ type: 'jsonb', nullable: true })
  media: string[]; // 이미지 URL 배열 (최대 4개)

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;
  // type별 메타데이터:
  // CLIP: { videoUrl, platform, thumbnailUrl }
  // SCRIM_RESULT: { scrimId, teamAScore, teamBScore, mvpId }
  // ACHIEVEMENT: { achievementId, achievementName }
  // GAME_RESULT: { gameCode, score, rank }
  // BALANCE_GAME: { balanceGameId }

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean; // 프로필 상단 고정

  @Column({ type: 'enum', enum: PostVisibility, default: PostVisibility.PUBLIC })
  visibility: PostVisibility;

  // Relations
  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'authorId' })
  author: ClanMember;

  @OneToMany(() => PostLike, (l) => l.post)
  likes: PostLike[];

  @OneToMany(() => PostComment, (c) => c.post)
  comments: PostComment[];
}
