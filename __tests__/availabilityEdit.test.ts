import {
  addException,
  addExceptionWindow,
  addWindow,
  copyDayTo,
  errorMap,
  moveException,
  removeException,
  removeExceptionWindow,
  removeWindow,
  shiftTime,
  updateExceptionWindow,
  updateWindow,
  windowsOnDay,
} from '@/domain/availabilityEdit';
import { validateAvailability } from '@/domain/trainerAvailability';
import type { WeeklyWindow } from '@/domain/types';

const w = (id: string, weekday: number, startTime: string, endTime: string, location = 'Floor'): WeeklyWindow => ({
  id,
  weekday,
  startTime,
  endTime,
  location,
});

function counter(prefix = 'n') {
  let n = 0;
  return () => `${prefix}${++n}`;
}

describe('shiftTime', () => {
  test('moves in either direction and clamps to the day', () => {
    expect(shiftTime('09:00', 15)).toBe('09:15');
    expect(shiftTime('09:00', -15)).toBe('08:45');
    expect(shiftTime('00:00', -15)).toBe('00:00');
    expect(shiftTime('23:55', 15)).toBe('24:00');
  });
  test('leaves malformed times alone', () => {
    expect(shiftTime('9am', 15)).toBe('9am');
  });
});

describe('addWindow / updateWindow / removeWindow', () => {
  test('first window on a day defaults to 09:00-10:00 at the given location', () => {
    const out = addWindow([], 2, 'Studio B', 'a');
    expect(out).toEqual([w('a', 2, '09:00', '10:00', 'Studio B')]);
  });

  test('later windows start where the last one ends and do not overlap', () => {
    const start = [w('a', 2, '09:00', '12:00')];
    const out = addWindow(start, 2, 'Floor', 'b');
    expect(windowsOnDay(out, 2).map((x) => [x.startTime, x.endTime])).toEqual([
      ['09:00', '12:00'],
      ['12:00', '13:00'],
    ]);
    expect(validateAvailability({ weekly: out, effectiveFrom: '2026-10-14', exceptions: [] }).ok).toBe(true);
  });

  test('adding late in the day falls back to a valid window rather than running past midnight', () => {
    const out = addWindow([w('a', 1, '22:30', '24:00')], 1, 'Floor', 'b');
    expect(windowsOnDay(out, 1).some((x) => x.id === 'b' && x.startTime === '09:00')).toBe(true);
  });

  test('update patches one window; remove drops it; inputs are not mutated', () => {
    const start = [w('a', 1, '09:00', '10:00'), w('b', 1, '11:00', '12:00')];
    const snapshot = JSON.stringify(start);
    const updated = updateWindow(start, 'b', { endTime: '13:00' });
    expect(updated[1].endTime).toBe('13:00');
    expect(updated[0]).toBe(start[0]);
    expect(removeWindow(updated, 'a').map((x) => x.id)).toEqual(['b']);
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  test('windowsOnDay sorts by start time', () => {
    const out = windowsOnDay([w('b', 3, '15:00', '16:00'), w('a', 3, '09:00', '10:00'), w('c', 4, '08:00', '09:00')], 3);
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('copyDayTo', () => {
  const base = [w('a', 2, '09:00', '12:00'), w('b', 2, '15:00', '18:00'), w('old', 4, '07:00', '08:00')];

  test('replaces the target days with fresh-id copies of the source day', () => {
    const out = copyDayTo(base, 2, [4, 5], counter());
    expect(windowsOnDay(out, 2).map((x) => x.id)).toEqual(['a', 'b']);
    expect(windowsOnDay(out, 4).map((x) => [x.startTime, x.endTime])).toEqual([
      ['09:00', '12:00'],
      ['15:00', '18:00'],
    ]);
    expect(windowsOnDay(out, 5)).toHaveLength(2);
    expect(out.find((x) => x.id === 'old')).toBeUndefined();
    expect(new Set(out.map((x) => x.id)).size).toBe(out.length);
  });

  test('copying from an empty day clears the targets', () => {
    expect(windowsOnDay(copyDayTo(base, 0, [2]), 2)).toEqual([]);
  });

  test('ignores the source day as a target and no-ops on an empty target list', () => {
    expect(copyDayTo(base, 2, [2])).toBe(base);
    expect(copyDayTo(base, 2, [])).toBe(base);
  });
});

describe('exceptions', () => {
  test('block adds an empty blocked date; custom seeds one window; dates stay sorted', () => {
    const ids = counter('e');
    let ex = addException([], '2026-11-02', 'custom', 'Floor', ids);
    ex = addException(ex, '2026-10-20', 'blocked', 'Floor', ids);
    expect(ex.map((e) => e.date)).toEqual(['2026-10-20', '2026-11-02']);
    expect(ex[0].windows).toEqual([]);
    expect(ex[1].windows).toHaveLength(1);
  });

  test('a second exception on the same date replaces the first', () => {
    let ex = addException([], '2026-10-20', 'blocked', 'Floor');
    ex = addException(ex, '2026-10-20', 'custom', 'Floor');
    expect(ex).toHaveLength(1);
    expect(ex[0].kind).toBe('custom');
  });

  test('move replaces whatever else sits on the target date; remove drops by id', () => {
    const ids = counter('e');
    let ex = addException([], '2026-10-20', 'blocked', 'Floor', ids);
    ex = addException(ex, '2026-10-22', 'custom', 'Floor', ids);
    const movingId = ex.find((e) => e.kind === 'custom')!.id;
    const moved = moveException(ex, movingId, '2026-10-20');
    expect(moved).toHaveLength(1);
    expect(moved[0].kind).toBe('custom');
    expect(removeException(moved, movingId)).toEqual([]);
  });

  test('custom exception windows can be added, edited and removed; blocked ones cannot gain windows', () => {
    const ids = counter('e');
    let ex = addException([], '2026-10-20', 'custom', 'Floor', ids);
    const exId = ex[0].id;
    ex = addExceptionWindow(ex, exId, 'Floor', 'extra');
    expect(ex[0].windows.map((x) => x.id)).toContain('extra');
    ex = updateExceptionWindow(ex, 'extra', { startTime: '14:00', endTime: '15:00' });
    expect(ex[0].windows.find((x) => x.id === 'extra')?.startTime).toBe('14:00');
    ex = removeExceptionWindow(ex, 'extra');
    expect(ex[0].windows.map((x) => x.id)).not.toContain('extra');

    const blocked = addException([], '2026-10-21', 'blocked', 'Floor', ids);
    expect(addExceptionWindow(blocked, blocked[0].id, 'Floor', 'x')[0].windows).toEqual([]);
  });
});

describe('errorMap', () => {
  test('keeps the first message per id so the inline error is stable', () => {
    expect(errorMap([{ id: 'a', msg: 'first' }, { id: 'a', msg: 'second' }, { id: 'b', msg: 'other' }])).toEqual({
      a: 'first',
      b: 'other',
    });
  });

  test('works with validateAvailability output', () => {
    const v = validateAvailability({
      weekly: [w('a', 1, '09:00', '10:00'), w('b', 1, '09:30', '11:00')],
      effectiveFrom: '2026-10-14',
      exceptions: [],
    });
    expect(Object.keys(errorMap(v.errors))).toEqual(['b']);
  });
});
