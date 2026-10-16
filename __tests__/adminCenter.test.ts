import {
  adminCenterTiles,
  canOpenAdminCenter,
  centsFromDollars,
  dollarsFromCents,
  formatHoursText,
  newSlugId,
  optionalWholeNumber,
  parseHoursText,
  planSubtitleForFee,
} from '@/domain/adminCenter';

const keys = (role: string) => adminCenterTiles(role).map((t) => t.key);

describe('Admin Control Center gating', () => {
  it('shows IT every tile, including the system ones', () => {
    expect(keys('it_admin')).toEqual(
      expect.arrayContaining(['plans', 'lessons', 'campaigns', 'wellness', 'guest', 'childWatch', 'toggles', 'branding', 'thresholds', 'audit'])
    );
  });

  it('hides the IT-only tiles from Staff Admin but keeps business tiles and the change log', () => {
    const k = keys('staff_admin');
    expect(k).toEqual(expect.arrayContaining(['plans', 'campaigns', 'childWatch', 'audit']));
    expect(k).not.toEqual(expect.arrayContaining(['toggles']));
    expect(k).not.toContain('branding');
    expect(k).not.toContain('thresholds');
  });

  it('limits directors to their own sections', () => {
    expect(keys('wellness_director')).toEqual(['lessons', 'wellness', 'stats']);
    expect(keys('membership_director')).toEqual(['campaigns', 'stats']);
  });

  it('shows the swim class and template tiles to the right roles', () => {
    for (const role of ['it_admin', 'staff_admin']) expect(keys(role)).toEqual(expect.arrayContaining(['swimClasses', 'templates']));
    expect(keys('aquatics_director')).toContain('swimClasses');
    expect(keys('aquatics_director')).not.toContain('templates');
  });

  it('gives front desk, trainers, and members no access', () => {
    for (const role of ['desk', 'trainer', 'member', undefined]) {
      expect(canOpenAdminCenter(role)).toBe(false);
    }
    expect(canOpenAdminCenter('it_admin')).toBe(true);
  });
});

describe('Admin Control Center helpers', () => {
  it('converts dollars to cents strictly', () => {
    expect(centsFromDollars('59')).toBe(5900);
    expect(centsFromDollars('$12.50')).toBe(1250);
    expect(centsFromDollars('0')).toBe(0);
    for (const bad of ['', 'abc', '-5', '1.234', '1,5']) expect(centsFromDollars(bad)).toBeNull();
    expect(dollarsFromCents(5900)).toBe('59');
    expect(dollarsFromCents(1250)).toBe('12.50');
  });

  it('parses optional whole numbers', () => {
    expect(optionalWholeNumber(' ')).toBeUndefined();
    expect(optionalWholeNumber('18')).toBe(18);
    expect(optionalWholeNumber('1.5')).toBeNaN();
  });

  it('builds unique readable ids', () => {
    expect(newSlugId('Summer Pass!', [])).toBe('summer-pass');
    expect(newSlugId('Summer Pass', ['summer-pass', 'summer-pass-2'])).toBe('summer-pass-3');
    expect(newSlugId('***', [])).toBe('item');
  });

  it('keeps the plan subtitle in step with the enrollment fee', () => {
    expect(planSubtitleForFee('Ages 13 to 17 - $12 enrollment fee', 2000)).toBe('Ages 13 to 17 - $20 enrollment fee');
    expect(planSubtitleForFee('1 adult + all children · $99 enrollment fee', 0)).toBe('1 adult + all children · Free enrollment fee');
    expect(planSubtitleForFee('No fee mentioned', 500)).toBe('No fee mentioned');
  });

  it('round-trips Child Watch hours text', () => {
    const windows = parseHoursText('09:00-12:00, 16:00-20:00');
    expect(windows).toEqual([{ open: '09:00', close: '12:00' }, { open: '16:00', close: '20:00' }]);
    expect(formatHoursText(windows ?? [])).toBe('09:00-12:00, 16:00-20:00');
    expect(parseHoursText('')).toEqual([]);
    expect(parseHoursText('Closed')).toEqual([]);
    expect(parseHoursText('9-noon')).toBeNull();
  });
});
