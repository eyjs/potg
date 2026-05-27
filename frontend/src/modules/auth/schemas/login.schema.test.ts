import { loginSchema } from './login.schema';

describe('loginSchema', () => {
  it('정상 케이스: username + password 채워짐 → success', () => {
    const result = loginSchema.safeParse({
      username: 'testuser',
      password: 'pass1234',
    });
    expect(result.success).toBe(true);
  });

  it('username 빈 값 → 길이 에러', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'pass1234',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'username');
      expect(issue?.message).toContain('아이디');
    }
  });

  it('password 빈 값 → 길이 에러', () => {
    const result = loginSchema.safeParse({
      username: 'testuser',
      password: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'password');
      expect(issue?.message).toContain('비밀번호');
    }
  });

  it('rememberMe 는 optional — 생략해도 OK', () => {
    const result = loginSchema.safeParse({
      username: 'a',
      password: 'b',
    });
    expect(result.success).toBe(true);
  });
});
