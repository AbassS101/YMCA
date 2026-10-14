import { DEFAULT_CHILD_WATCH_RULES } from '@/domain/childWatch';
import { headcountMismatch, ratioStatus, requiredStaff, staffOnDutyAt } from '@/domain/childWatchStaffing';

const ratios = DEFAULT_CHILD_WATCH_RULES.ratios;

describe('requiredStaff', () => {
  it('needs nobody for an empty room', () => {
    expect(requiredStaff([], ratios)).toBe(0);
  });
  it('applies the band for each age (1:4 under 24 mo, 1:6 to 60 mo, 1:10 to 156 mo)', () => {
    expect(requiredStaff([6, 12, 18, 24], ratios)).toBe(1);
    expect(requiredStaff([6, 12, 18, 24, 20], ratios)).toBe(2);
    expect(requiredStaff([30, 40, 50, 60, 36, 48], ratios)).toBe(1);
    expect(requiredStaff([30, 40, 50, 60, 36, 48, 30], ratios)).toBe(2);
    expect(requiredStaff(Array(10).fill(100), ratios)).toBe(1);
    expect(requiredStaff(Array(11).fill(100), ratios)).toBe(2);
  });
  it('shares staff across mixed ages', () => {
    // 2 infants (0.5) + 3 preschoolers (0.5) = exactly 1 staff
    expect(requiredStaff([6, 6, 40, 40, 40], ratios)).toBe(1);
    expect(requiredStaff([6, 6, 40, 40, 40, 40], ratios)).toBe(2);
  });
  it('uses the oldest band for children beyond the last one and tolerates unsorted bands', () => {
    expect(requiredStaff([200], ratios)).toBe(1);
    expect(requiredStaff([6], [...ratios].reverse())).toBe(1);
    expect(requiredStaff(Array(5).fill(6), [...ratios].reverse())).toBe(2);
  });
});

describe('staffOnDutyAt', () => {
  const shifts = [
    { id: 's1', staffId: 'a', date: '2026-10-14', start: '09:00', end: '12:00' },
    { id: 's2', staffId: 'b', date: '2026-10-14', start: '10:00', end: '12:00' },
    { id: 's3', staffId: 'a', date: '2026-10-14', start: '10:30', end: '11:30' },
    { id: 's4', staffId: 'c', date: '2026-10-15', start: '09:00', end: '12:00' },
  ];
  it('counts distinct staff covering the moment', () => {
    expect(staffOnDutyAt(shifts, new Date('2026-10-14T09:30:00'))).toBe(1);
    expect(staffOnDutyAt(shifts, new Date('2026-10-14T10:45:00'))).toBe(2);
  });
  it('treats start as inclusive and end as exclusive', () => {
    expect(staffOnDutyAt(shifts, new Date('2026-10-14T09:00:00'))).toBe(1);
    expect(staffOnDutyAt(shifts, new Date('2026-10-14T12:00:00'))).toBe(0);
  });
  it('ignores other days', () => {
    expect(staffOnDutyAt(shifts, new Date('2026-10-16T10:00:00'))).toBe(0);
  });
});

describe('ratioStatus', () => {
  it('reports ok, at_limit and over', () => {
    expect(ratioStatus([], 0, ratios)).toBe('ok');
    expect(ratioStatus([6, 6], 2, ratios)).toBe('ok');
    expect(ratioStatus([6, 6], 1, ratios)).toBe('at_limit');
    expect(ratioStatus([6, 6, 6, 6, 6], 1, ratios)).toBe('over');
    expect(ratioStatus([6], 0, ratios)).toBe('over');
  });
});

describe('headcountMismatch', () => {
  it('is counted minus expected', () => {
    expect(headcountMismatch(5, 5)).toBe(0);
    expect(headcountMismatch(4, 5)).toBe(-1);
    expect(headcountMismatch(6, 5)).toBe(1);
  });
});
