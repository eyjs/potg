import { z } from 'zod';

/**
 * 클랜 생성 폼 스키마.
 *
 * - name: 1~50자
 * - tag: 1~5자 (기존 maxLength 정책 유지)
 * - description: 선택 (최대 500자)
 */
export const createClanSchema = z.object({
  name: z
    .string()
    .min(1, '클랜 이름을 입력해주세요')
    .max(50, '클랜 이름은 50자 이내로 입력해주세요'),
  tag: z
    .string()
    .min(1, '클랜 태그를 입력해주세요')
    .max(5, '클랜 태그는 5자 이내로 입력해주세요'),
  description: z
    .string()
    .max(500, '설명은 500자 이내로 입력해주세요')
    .optional(),
});

export type CreateClanFormValues = z.infer<typeof createClanSchema>;
