import { z } from 'zod';

/**
 * 프로필 (배틀태그/아바타) 업데이트 스키마.
 * - battleTag: 비어있지 않은 문자열 (서버에서 형식 검증)
 * - avatarUrl: 선택 (이미지 업로드 안한 경우 빈값 허용)
 */
export const updateProfileSchema = z.object({
  battleTag: z.string().min(1, '배틀태그를 입력해주세요'),
  avatarUrl: z.string().optional().default(''),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
