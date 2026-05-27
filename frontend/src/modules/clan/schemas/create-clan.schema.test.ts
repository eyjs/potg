import { createClanSchema } from './create-clan.schema';

describe('createClanSchema', () => {
  it('정상: name + tag → success', () => {
    const result = createClanSchema.safeParse({
      name: '테스트 클랜',
      tag: 'TST',
    });
    expect(result.success).toBe(true);
  });

  it('name 빈 값 → 에러', () => {
    const result = createClanSchema.safeParse({ name: '', tag: 'TST' });
    expect(result.success).toBe(false);
  });

  it('tag 6자 이상 → 길이 에러', () => {
    const result = createClanSchema.safeParse({
      name: '클랜',
      tag: 'TOOLONG',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'tag');
      expect(issue?.message).toContain('5자');
    }
  });

  it('description 은 optional', () => {
    const result = createClanSchema.safeParse({ name: '클랜', tag: 'T' });
    expect(result.success).toBe(true);
  });

  it('description 500자 초과 → 에러', () => {
    const result = createClanSchema.safeParse({
      name: '클랜',
      tag: 'T',
      description: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
