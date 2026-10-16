import { canOpenStats, statsScopesForRole } from '@/domain/stats/statsScopes';

describe('statsScopesForRole', () => {
  it('gives admins and IT every scope', () => {
    const all = ['branch', 'childWatch', 'aquatics', 'wellness', 'membership'];
    expect(statsScopesForRole('admin')).toEqual(all);
    expect(statsScopesForRole('staff_admin')).toEqual(all);
    expect(statsScopesForRole('it_admin')).toEqual(all);
  });

  it('gives each director only their own area', () => {
    expect(statsScopesForRole('child_watch_director')).toEqual(['childWatch']);
    expect(statsScopesForRole('aquatics_director')).toEqual(['aquatics']);
    expect(statsScopesForRole('wellness_director')).toEqual(['wellness']);
    expect(statsScopesForRole('membership_director')).toEqual(['membership']);
  });

  it('keeps the Wellness Director out of branch stats', () => {
    expect(statsScopesForRole('wellness_director')).not.toContain('branch');
  });

  it('gives everyone else nothing', () => {
    for (const role of ['child_watch_supervisor', 'trainer', 'swim_instructor', 'desk', 'staff', 'maintenance', 'member', 'guest']) {
      expect(statsScopesForRole(role)).toEqual([]);
    }
    expect(statsScopesForRole(undefined)).toEqual([]);
    expect(statsScopesForRole(null)).toEqual([]);
  });

  it('canOpenStats follows the scope list', () => {
    expect(canOpenStats('admin')).toBe(true);
    expect(canOpenStats('aquatics_director')).toBe(true);
    expect(canOpenStats('child_watch_supervisor')).toBe(false);
    expect(canOpenStats(undefined)).toBe(false);
  });

  it('returns a fresh array each call', () => {
    const a = statsScopesForRole('admin');
    a.pop();
    expect(statsScopesForRole('admin')).toHaveLength(5);
  });
});
