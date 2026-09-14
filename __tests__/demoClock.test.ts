import { DEMO_TODAY, getDemoToday } from '@/domain/demoClock';

test('demo clock is frozen at 2026-09-14', () => {
  expect(DEMO_TODAY).toBe('2026-09-14');
  expect(getDemoToday()).toBe('2026-09-14');
});
