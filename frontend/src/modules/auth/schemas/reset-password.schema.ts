import { z } from 'zod';

/**
 * 비밀번호 재설정 폼 스키마.
 *
 * 정책:
 *   - 8자 이상 (필수)
 *   - 숫자 1자 이상 포함 (필수)
 *   - 특수문자 — UI 표시는 하되 검증은 하지 않음 (선택)
 *   - 두 입력값 일치 (refine)
 *
 * 실시간 시각 피드백 (체크리스트) 은 form.watch() 로 별도 계산하므로
 * 본 스키마는 제출 검증만 담당.
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, '8자 이상 입력해주세요')
      .regex(/\d/, '숫자를 1자 이상 포함해주세요'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
