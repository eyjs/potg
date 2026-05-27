import { pointRuleFormSchema } from './point-rule.schema';

describe('pointRuleFormSchema', () => {
  it('정상 케이스 → success', () => {
    const r = pointRuleFormSchema.safeParse({
      code: 'ATT_BASE',
      name: '출석 기본',
      category: 'ATTENDANCE',
      points: '100',
      isActive: true,
    });
    expect(r.success).toBe(true);
  });

  it('code 빈 값 → 에러', () => {
    const r = pointRuleFormSchema.safeParse({
      code: '',
      name: '이름',
      category: 'ATTENDANCE',
      points: '100',
      isActive: true,
    });
    expect(r.success).toBe(false);
  });

  it('points 정수 아닌 값 → regex 에러', () => {
    const r = pointRuleFormSchema.safeParse({
      code: 'C',
      name: 'N',
      category: 'ATTENDANCE',
      points: '1.5',
      isActive: true,
    });
    expect(r.success).toBe(false);
  });

  it('잘못된 category enum → 에러', () => {
    const r = pointRuleFormSchema.safeParse({
      code: 'C',
      name: 'N',
      category: 'BOGUS',
      points: '10',
      isActive: true,
    });
    expect(r.success).toBe(false);
  });

  it('음수 포인트도 허용 (PENALTY)', () => {
    const r = pointRuleFormSchema.safeParse({
      code: 'P',
      name: 'Penalty',
      category: 'PENALTY',
      points: '-50',
      isActive: true,
    });
    expect(r.success).toBe(true);
  });
});
