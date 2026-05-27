import { z } from 'zod';

/**
 * 로그인 폼 스키마.
 *
 * - username: 비어있지 않은 문자열 (서버에서 실제 검증)
 * - password: 1자 이상 (정책 검증은 reset-password 에서, 여기는 빈 값만 막음)
 * - rememberMe: 옵션 (현재 미사용이지만 UI 호환 위해 유지)
 */
export const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
