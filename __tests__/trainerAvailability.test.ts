import {
  expandAvailability,
  findConflicts,
  normalizeAvailability,
  normalizeWindows,
  toMinutes,
  validateAvailability,
  validateWindows,
} from '@/domain/trainerAvailability';
import type { TrainerAvailability } from '@/domain/types';

const w = (id: string, startTime: string, endTime: string, location = 'Floor') => ({ id, startTime, endTime, location });

const av = (over: Partial<TrainerAvailability> = {}): TrainerAvailability => ({
  staffId: 'staff-x',
  weekly: [
    { id: 'a', weekday: 2, startTime: '09:00', endTime: '12:00', location: 'Floor' },
    { id: 'b', weekday: 2, startTime: '15:00', endTime: '18:00', location: 'Floor' },
  ],
  effectiveFrom: '2026-01-01',
  exceptions: [],
  updatedAt: '2026-09-01T00:00:00-04:00',
  updatedBy: 'staff-admin',
  ...over,
});

describe('toMinutes', () => {
  it('parses HH:MM and rejects junk', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('24:00')).toBe(1440);
    expect(Number.isNaN(toMinutes('9:30'))).toBe(true);
    expect(Number.isNaN(toMinutes('25:00'))).toBe(true);
  });
});

describe('validateWindows', () => {
  it('accepts gaps and touching windows', () => {
    expect(validateWindows([w('1', '09:00', '10:00'), w('2', '10:00', '11:00'), w('3', '14:00', '15:00')]).ok).toBe(true);
  });

  it('rejects end before start, off-step times, short windows and overlaps', () => {
    const r = validateWindows([
      w('rev', '11:00', '10:00'),
      w('step', '09:10', '10:00'),
      w('short', '12:00', '12:15'),
      w('o1', '13:00', '14:30'),
      w('o2', '14:00', '15:00'),
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors.map((e) => e.id).sort()).toEqual(['o2', 'rev', 'short', 'step']);
  });
});

describe('validateAvailability', () => {
  it('checks each weekday separately and custom exceptions', () => {
    const base = { effectiveFrom: '2026-01-01', exceptions: [] };
    expect(
      validateAvailability({
        ...base,
        weekly: [
          { id: 'a', weekday: 1, startTime: '09:00', endTime: '10:00', location: 'F' },
          { id: 'b', weekday: 2, startTime: '09:00', endTime: '10:00', location: 'F' },
        ],
      }).ok
    ).toBe(true);
    const bad = validateAvailability({
      ...base,
      weekly: [],
      exceptions: [{ id: 'e', date: '2026-09-15', kind: 'custom', windows: [w('x', '10:00', '09:00')] }],
    });
    expect(bad.errors[0].id).toBe('x');
    expect(validateAvailability({ ...base, weekly: [], effectiveUntil: '2025-01-01' }).ok).toBe(false);
  });
});

describe('normalizeWindows', () => {
  it('sorts and merges touching windows at the same location only', () => {
    const out = normalizeWindows([
      w('c', '13:00', '14:00', 'Pool'),
      w('b', '10:00', '11:00'),
      w('a', '09:00', '10:00'),
      w('d', '14:00', '15:00', 'Gym'),
    ]);
    expect(out.map((x) => [x.startTime, x.endTime, x.location])).toEqual([
      ['09:00', '11:00', 'Floor'],
      ['13:00', '14:00', 'Pool'],
      ['14:00', '15:00', 'Gym'],
    ]);
  });

  it('normalizeAvailability merges per weekday', () => {
    const out = normalizeAvailability({
      effectiveFrom: '2026-01-01',
      exceptions: [],
      weekly: [
        { id: 'a', weekday: 2, startTime: '10:00', endTime: '11:00', location: 'F' },
        { id: 'b', weekday: 2, startTime: '09:00', endTime: '10:00', location: 'F' },
        { id: 'c', weekday: 3, startTime: '10:00', endTime: '11:00', location: 'F' },
      ],
    });
    expect(out.weekly).toHaveLength(2);
    expect(out.weekly[0]).toMatchObject({ weekday: 2, startTime: '09:00', endTime: '11:00' });
  });
});

describe('expandAvailability', () => {
  it('repeats the weekly schedule with a gap and stable ids', () => {
    // 2026-09-15 and 2026-09-22 are Tuesdays.
    const slots = expandAvailability(av(), 'branch-1', '2026-09-14', '2026-09-27');
    expect(slots.map((s) => [s.start, s.end])).toEqual([
      ['2026-09-15T09:00:00-04:00', '2026-09-15T12:00:00-04:00'],
      ['2026-09-15T15:00:00-04:00', '2026-09-15T18:00:00-04:00'],
      ['2026-09-22T09:00:00-04:00', '2026-09-22T12:00:00-04:00'],
      ['2026-09-22T15:00:00-04:00', '2026-09-22T18:00:00-04:00'],
    ]);
    expect(slots[0]).toMatchObject({ id: 'avail-staff-x-2026-09-15-a', staffId: 'staff-x', branchId: 'branch-1' });
  });

  it('respects the effective range', () => {
    const slots = expandAvailability(av({ effectiveFrom: '2026-09-20', effectiveUntil: '2026-09-22' }), 'b', '2026-09-14', '2026-09-30');
    expect(slots.map((s) => s.start.slice(0, 10))).toEqual(['2026-09-22', '2026-09-22']);
    expect(expandAvailability(undefined, 'b', '2026-09-14', '2026-09-30')).toEqual([]);
  });

  it('uses the right Eastern offset across the DST change on 2026-11-01', () => {
    const weekly = [
      { id: 'sat', weekday: 6, startTime: '10:00', endTime: '11:00', location: 'F' },
      { id: 'mon', weekday: 1, startTime: '10:00', endTime: '11:00', location: 'F' },
    ];
    const slots = expandAvailability(av({ weekly }), 'b', '2026-10-31', '2026-11-02');
    expect(slots.map((s) => s.start)).toEqual(['2026-10-31T10:00:00-04:00', '2026-11-02T10:00:00-05:00']);
    // Both are 10:00 Eastern, so the UTC instants differ by an hour.
    expect(new Date(slots[0].start).toISOString()).toBe('2026-10-31T14:00:00.000Z');
    expect(new Date(slots[1].start).toISOString()).toBe('2026-11-02T15:00:00.000Z');
  });

  it('blocked dates yield nothing and custom dates replace the weekly windows', () => {
    const exceptions = [
      { id: 'e1', date: '2026-09-15', kind: 'blocked' as const, windows: [] },
      { id: 'e2', date: '2026-09-22', kind: 'custom' as const, windows: [w('c1', '07:00', '08:00')] },
    ];
    const slots = expandAvailability(av({ exceptions }), 'b', '2026-09-14', '2026-09-27');
    expect(slots.map((s) => [s.id, s.start])).toEqual([['avail-staff-x-2026-09-22-c1', '2026-09-22T07:00:00-04:00']]);
  });

  it('skips windows that run past midnight', () => {
    const weekly = [{ id: 'late', weekday: 2, startTime: '23:00', endTime: '24:30', location: 'F' }];
    expect(expandAvailability(av({ weekly }), 'b', '2026-09-15', '2026-09-15')).toEqual([]);
  });
});

describe('findConflicts', () => {
  const lesson = (id: string, start: string, end: string, status = 'booked') => ({ id, status: status as 'booked', start, end });
  const request = (id: string, status: string, start: string, end: string, lessonId?: string) => ({
    id,
    status: status as 'pending',
    start,
    end,
    memberName: 'Pat',
    lessonId,
  });

  it('reports booked lessons and open requests outside the windows, not ones inside', () => {
    const conflicts = findConflicts(
      av(),
      'b',
      [
        lesson('in', '2026-09-15T09:00:00-04:00', '2026-09-15T10:00:00-04:00'),
        lesson('gap', '2026-09-15T13:00:00-04:00', '2026-09-15T14:00:00-04:00'),
        lesson('gone', '2026-09-15T13:00:00-04:00', '2026-09-15T14:00:00-04:00', 'cancelled'),
      ],
      [
        request('pend', 'pending', '2026-09-15T17:00:00.000Z', '2026-09-15T18:00:00.000Z'), // 13:00 Eastern, in the gap
        request('ctr', 'countered', '2026-09-15T20:00:00.000Z', '2026-09-15T21:00:00.000Z'), // 16:00 Eastern, inside
        request('done', 'declined', '2026-09-15T17:00:00.000Z', '2026-09-15T18:00:00.000Z'),
        request('acc', 'accepted', '2026-09-15T13:00:00-04:00', '2026-09-15T14:00:00-04:00', 'gap'),
        request('acc-orphan', 'accepted', '2026-09-16T13:00:00-04:00', '2026-09-16T14:00:00-04:00'),
      ]
    );
    expect(conflicts.map((c) => `${c.kind}:${c.id}`).sort()).toEqual(['lesson:gap', 'request:acc-orphan', 'request:pend']);
    expect(conflicts.find((c) => c.id === 'pend')?.memberName).toBe('Pat');
  });

  it('counts one-off slots as availability and ignores items that already ended', () => {
    const gap = lesson('gap', '2026-09-15T13:00:00-04:00', '2026-09-15T14:00:00-04:00');
    const extra = [{ start: '2026-09-15T12:30:00-04:00', end: '2026-09-15T14:30:00-04:00' }];
    expect(findConflicts(av(), 'b', [gap], [], { extraWindows: extra })).toEqual([]);
    expect(findConflicts(av(), 'b', [gap], [], { fromIso: '2026-09-16T00:00:00-04:00' })).toEqual([]);
    expect(findConflicts(av({ weekly: [] }), 'b', [gap], [])).toHaveLength(1);
  });
});
