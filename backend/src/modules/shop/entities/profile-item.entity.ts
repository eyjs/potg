import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ProfileItemCategory {
  THEME = 'THEME',
  FRAME = 'FRAME',
  PET = 'PET',
  BGM = 'BGM',
  EFFECT = 'EFFECT',
}

@Entity('profile_items')
export class ProfileItem extends BaseEntity {
  @Column({ unique: true })
  code: string; // "THEME_NEON", "FRAME_GOLD", "PET_HAMSTER"

  @Column()
  name: string; // "네온 테마"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ProfileItemCategory })
  category: ProfileItemCategory;

  @Column({ type: 'int' })
  price: number; // 포인트 가격

  @Column({ type: 'varchar', nullable: true })
  previewUrl: string; // 미리보기 이미지

  @Column({ type: 'varchar', nullable: true })
  assetUrl: string; // 실제 에셋 (CSS 변수, 이미지 URL 등)

  @Column({ type: 'jsonb', nullable: true })
  assetData: Record<string, unknown>;
  // THEME: { bgColor, accentColor, textColor, ... }
  // FRAME: { borderStyle, glowColor, ... }
  // PET: { spriteUrl, animationData, emoji }
  // BGM: { audioUrl, duration }

  @Column({ type: 'boolean', default: false })
  isLimited: boolean; // 한정판

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
