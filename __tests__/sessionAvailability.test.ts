import { availableAt, busyIntervals, openStartTimes, sessionLengthsFor } from '@/domain/sessionAvailability';
import { canInstantBook, canTransition, canViewSessionRequest } from '@/domain/sessionRequests';
import type { LessonSlot } from '@/domain/types';

const win = (staffId: string, s: string, e: string): LessonSlot => ({
  id: `${staffId}-${s}`,
  staffId,
  branchId: 'b',
  start: `2026-10-20T${s}:00-04:00`,
  end: `2026-10-20T${e}:00-04:00`,
  location: 'Floor',
});

describe('openStartTimes', () => {
  it('splits windows into 60 min starts every 30 minutes', () => {
    const times = openStartTimes([win('a', '09:00', '11:00')], [], 60);
    expect(times).toHaveLength(3); // 9:00, 9:30, 10:00
  });

  it('handles two windows and 30 min sessions', () => {
    const times = openStartTimes([win('a', '09:00', '10:00'), win('a', '16:00', '17:00')], [], 30);
    expect(times).toHaveLength(4);
  });

  it('excludes times overlapping busy intervals', () => {
    const busy = [{ start: '2026-10-20T10:00:00-04:00', end: '2026-10-20T11:00:00-04:00' }];
    const times = openStartTimes([win('a', '09:00', '12:00')], busy, 60);
    const starts = times.map((t) => t.start);
    expect(starts).toContain(new Date('2026-10-20T09:00:00-04:00').toISOString());
    expect(starts).not.toContain(new Date('2026-10-20T09:30:00-04:00').toISOString());
    expect(starts).not.toContain(new Date('2026-10-20T10:30:00-04:00').toISOString());
    expect(starts).toContain(new Date('2026-10-20T11:00:00-04:00').toISOString());
  });

  it('skips times before `after`', () => {
    const times = openStartTimes([win('a', '09:00', '11:00')], [], 30, 30, '2026-10-20T10:00:00-04:00');
    expect(times).toHaveLength(2);
  });
});

describe('busyIntervals', () => {
  it('counts booked lessons and accepted requests only (pending/countered do not block)', () => {
    const iv = { start: 's', end: 'e' };
    const out = busyIntervals(
      [{ ...iv, status: 'booked' }, { ...iv, status: 'cancelled' }],
      [{ ...iv, status: 'pending' }, { ...iv, status: 'declined' }, { ...iv, status: 'countered' }, { ...iv, status: 'accepted' }]
    );
    expect(out).toHaveLength(2);
  });
});

describe('availableAt', () => {
  it('combines trainers, respects member busy time and flags instant staff', () => {
    const windows = [win('a', '09:00', '10:00'), win('b', '09:00', '10:00')];
    const member = [{ start: '2026-10-20T09:00:00-04:00', end: '2026-10-20T09:30:00-04:00' }];
    const out = availableAt(windows, { a: [] }, member, 30, { instantStaffIds: new Set(['b']) });
    expect(out.every((t) => t.start !== new Date('2026-10-20T09:00:00-04:00').toISOString())).toBe(true);
    expect(out).toHaveLength(2);
    expect(out[0].instant).toBe(true);
  });
});

describe('sessionLengthsFor', () => {
  it('defaults to 30 and 60', () => {
    expect(sessionLengthsFor({})).toEqual([30, 60]);
    expect(sessionLengthsFor({ sessionLengths: [60] })).toEqual([60]);
  });
});

describe('request rules', () => {
  it('instant booking is off by default', () => {
    expect(canInstantBook({}, 'm1')).toBe(false);
    expect(canInstantBook({ instantBookMemberIds: ['m1'] }, 'm1')).toBe(true);
    expect(canInstantBook({ instantBookMemberIds: ['m1'] }, 'm2')).toBe(false);
  });

  it('transitions', () => {
    expect(canTransition('pending', 'accept', 'staff')).toBe(true);
    expect(canTransition('pending', 'accept', 'member')).toBe(false);
    expect(canTransition('countered', 'accept_counter', 'member')).toBe(true);
    expect(canTransition('declined', 'cancel', 'member')).toBe(false);
  });

  it('visibility by role', () => {
    const pt = { staffId: 's', memberId: 'm', lessonType: 'training' as const };
    const swim = { ...pt, lessonType: 'swim' as const };
    expect(canViewSessionRequest('wellness_director', 'x', pt)).toBe(true);
    expect(canViewSessionRequest('wellness_director', 'x', swim)).toBe(false);
    expect(canViewSessionRequest('aquatics_director', 'x', swim)).toBe(true);
    expect(canViewSessionRequest('aquatics_director', 'x', pt)).toBe(false);
    expect(canViewSessionRequest('staff_admin', 'x', swim)).toBe(true);
    expect(canViewSessionRequest('trainer', 'other', pt)).toBe(false);
    expect(canViewSessionRequest('trainer', 's', pt)).toBe(true);
  });
});
