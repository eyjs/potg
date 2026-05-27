import { z } from 'zod';

/**
 * 비밀번호 변경 (로그인 상태) 폼 스키마.
 *
 * - currentPassword: 1자 이상 (서버에서 실제 매칭 검증)
 * - newPassword: 8자 이상 + 숫자 1자 이상 (reset-password 와 동일 정책)
 * - confirmNewPassword: 일치 검증 (refine)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z
      .string()
      .min(8, '새 비밀번호는 8자 이상이어야 합니다')
      .regex(/\d/, '숫자를 1자 이상 포함해주세요'),
    confirmNewPassword: z.string().min(1, '확인 비밀번호를 입력해주세요'),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: '새 비밀번호가 일치하지 않습니다',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
