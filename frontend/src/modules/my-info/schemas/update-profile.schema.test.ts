import { updateProfileSchema } from './update-profile.schema';

describe('updateProfileSchema', () => {
  it('정상: battleTag + avatarUrl → success', () => {
    const r = updateProfileSchema.safeParse({
      battleTag: 'Tag#1234',
      avatarUrl: 'https://example.com/a.png',
    });
    expect(r.success).toBe(true);
  });

  it('avatarUrl 생략 가능 (default "")', () => {
    const r = updateProfileSchema.safeParse({ battleTag: 'Tag#1' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.avatarUrl).toBe('');
  });

  it('battleTag 빈 값 → 에러', () => {
    const r = updateProfileSchema.safeParse({ battleTag: '', avatarUrl: '' });
    expect(r.success).toBe(false);
  });
});
