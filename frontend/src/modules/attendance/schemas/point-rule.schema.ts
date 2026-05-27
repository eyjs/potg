import { z } from 'zod';

const CATEGORIES = ['ATTENDANCE', 'ACTIVITY', 'ACHIEVEMENT', 'PENALTY'] as const;

/**
 * 포인트 규칙 폼 스키마.
 * points 는 string 으로 받아 parseInt — RHF + zod 패턴 (Input number value는 string).
 */
export const pointRuleFormSchema = z.object({
  code: z
    .string()
    .min(1, '코드를 입력해주세요')
    .max(50, '코드는 50자 이내'),
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(100, '이름은 100자 이내'),
  description: z.string().max(500, '설명은 500자 이내').optional().default(''),
  category: z.enum(CATEGORIES),
  points: z
    .string()
    .min(1, '포인트를 입력해주세요')
    .regex(/^-?\d+$/, '정수를 입력해주세요'),
  isActive: z.boolean(),
});

export type PointRuleFormValues = z.infer<typeof pointRuleFormSchema>;
