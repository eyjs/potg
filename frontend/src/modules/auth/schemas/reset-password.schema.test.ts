import { resetPasswordSchema } from './reset-password.schema';

describe('resetPasswordSchema', () => {
  it('정상 케이스: 8자 이상 + 숫자 포함 + 두 입력 일치 → success', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'pass1234',
      confirmPassword: 'pass1234',
    });
    expect(result.success).toBe(true);
  });

  it('8자 미만이면 password 필드에 길이 에러', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'a1',
      confirmPassword: 'a1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) =>
        i.path.includes('password'),
      );
      expect(passwordIssue?.message).toContain('8자');
    }
  });

  it('숫자가 없으면 password 필드에 regex 에러', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'password',
      confirmPassword: 'password',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) =>
        i.path.includes('password'),
      );
      expect(passwordIssue?.message).toContain('숫자');
    }
  });

  it('두 비밀번호 불일치 시 refine 에러 (path=confirmPassword)', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'pass1234',
      confirmPassword: 'pass5678',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const refineIssue = result.error.issues.find(
        (i) => i.path[0] === 'confirmPassword' && i.message.includes('일치'),
      );
      expect(refineIssue).toBeDefined();
    }
  });

  it('confirmPassword 가 빈 string 이면 길이 에러', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'pass1234',
      confirmPassword: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'confirmPassword',
      );
      expect(issue).toBeDefined();
    }
  });
});
