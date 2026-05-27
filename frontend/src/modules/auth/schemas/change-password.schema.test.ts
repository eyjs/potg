import { changePasswordSchema } from './change-password.schema';

describe('changePasswordSchema', () => {
  it('정상 케이스 → success', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old1',
      newPassword: 'new1pass',
      confirmNewPassword: 'new1pass',
    });
    expect(result.success).toBe(true);
  });

  it('새 비밀번호 8자 미만 → 길이 에러', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'n1',
      confirmNewPassword: 'n1',
    });
    expect(result.success).toBe(false);
  });

  it('새 비밀번호 숫자 없음 → regex 에러', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'newpassword',
      confirmNewPassword: 'newpassword',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'newPassword',
      );
      expect(issue?.message).toContain('숫자');
    }
  });

  it('새 비밀번호 불일치 → refine 에러 (path=confirmNewPassword)', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'new1pass',
      confirmNewPassword: 'diff1pass',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const refineIssue = result.error.issues.find(
        (i) => i.path[0] === 'confirmNewPassword' && i.message.includes('일치'),
      );
      expect(refineIssue).toBeDefined();
    }
  });

  it('currentPassword 빈 값 → 에러', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'new1pass',
      confirmNewPassword: 'new1pass',
    });
    expect(result.success).toBe(false);
  });
});
