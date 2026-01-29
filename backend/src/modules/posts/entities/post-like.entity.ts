import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Post } from './post.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

@Entity('post_likes')
@Unique(['postId', 'memberId'])
export class PostLike extends BaseEntity {
  @Column()
  @Index()
  postId: string;

  @Column()
  @Index()
  memberId: string;

  @ManyToOne(() => Post, (p) => p.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}
