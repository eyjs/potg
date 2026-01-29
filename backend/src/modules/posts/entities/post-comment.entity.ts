import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Post } from './post.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

@Entity('post_comments')
export class PostComment extends BaseEntity {
  @Column()
  @Index()
  postId: string;

  @Column()
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string; // 대댓글

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ManyToOne(() => Post, (p) => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'authorId' })
  author: ClanMember;

  @ManyToOne(() => PostComment, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: PostComment;
}
