import { applyConfigPatch, defaultAppConfig, normalizeAppConfig } from '@/domain/appConfig';
import { copyPoolDay, editablePoolDay, validateWeeklyPoolDays } from '@/domain/poolScheduleEditor';
import { findOpenLapSwimSlots, getCurrentSlotForPool, getPoolSlots } from '@/domain/poolScheduleData';
import type { PoolScheduleConfig } from '@/domain/branchContent';

function editedSchedule(): PoolScheduleConfig {
  const config = defaultAppConfig().poolSchedule;
  const block = editablePoolDay('indoor', 'monday', config).find((b) => !b.isClosed)!;
  return { ...config, weeklyDays: { 'indoor:monday': [{ ...block, title: 'Director lap swim', startTime: '7:00 AM', endTime: '9:00 AM', lapLanes: 4, recLanes: 2, programLanes: 0 }] } };
}

it('publishes edited times and lane allocations to the schedule, current status, and lap finder', () => {
  const config = editedSchedule();
  const published = applyConfigPatch(defaultAppConfig(), 'poolSchedule', config);
  const slots = getPoolSlots('indoor', 'monday', published);
  expect(slots).toHaveLength(1);
  expect(slots[0]).toMatchObject({ title: 'Director lap swim', startMinutes: 420, endMinutes: 540, lapLanes: 4, recLanes: 2 });
  expect(slots[0].laneAllocations.filter((lane) => lane.type === 'lap')).toHaveLength(4);
  expect(getCurrentSlotForPool('indoor', 'monday', 430, published)?.title).toBe('Director lap swim');
  expect(findOpenLapSwimSlots('indoor', 5, published).some((slot) => slot.day === 'monday')).toBe(false);
  expect(getPoolSlots('outdoor', 'monday', published)).toEqual(getPoolSlots('outdoor', 'monday'));
  expect(normalizeAppConfig({ poolSchedule: published }).poolSchedule).toEqual(published);
});

it('copies a whole day to multiple weekdays without sharing objects or altering other days', () => {
  const config = editedSchedule();
  const copied = copyPoolDay(config, 'indoor', 'monday', ['tuesday', 'thursday']);
  expect(validateWeeklyPoolDays(copied)).toBeNull();
  expect(getPoolSlots('indoor', 'tuesday', copied)[0]).toMatchObject({ day: 'tuesday', title: 'Director lap swim', startMinutes: 420 });
  expect(getPoolSlots('indoor', 'thursday', copied)[0].id).not.toBe(getPoolSlots('indoor', 'tuesday', copied)[0].id);
  expect(getPoolSlots('indoor', 'wednesday', copied)).toEqual(getPoolSlots('indoor', 'wednesday'));
  copied.weeklyDays!['indoor:tuesday'][0].title = 'Tuesday only';
  expect(config.weeklyDays!['indoor:monday'][0].title).toBe('Director lap swim');
});

it('blocks overlapping times, invalid time formats, and too many lanes at the save boundary', () => {
  const config = editedSchedule();
  const block = config.weeklyDays!['indoor:monday'][0];
  for (const patch of [{ startTime: '25:00 AM' }, { endTime: '6:00 AM' }, { lapLanes: 6 }, { lapLanes: 1.5 }, { templateId: 'unknown' }]) {
    expect(() => applyConfigPatch(defaultAppConfig(), 'poolSchedule', { ...config, weeklyDays: { 'indoor:monday': [{ ...block, ...patch }] } })).toThrow();
  }
  config.weeklyDays!['indoor:monday'].push({ ...block, id: 'overlap' });
  expect(validateWeeklyPoolDays(config)).toContain('overlap');
});

it('keeps legacy closure changes when copying and supports removing all times from a day', () => {
  const config = defaultAppConfig().poolSchedule;
  const original = getPoolSlots('indoor', 'monday').find((s) => !s.isClosed)!;
  config.slotOverrides[original.id] = { title: 'Maintenance', isClosed: true };
  const copied = copyPoolDay(config, 'indoor', 'monday', ['tuesday']);
  const closure = getPoolSlots('indoor', 'tuesday', copied).find((s) => s.title === 'Maintenance')!;
  expect(closure).toMatchObject({ isClosed: true, lapLanes: 0, recLanes: 0 });
  copied.weeklyDays!['indoor:tuesday'] = [];
  expect(getPoolSlots('indoor', 'tuesday', copied)).toEqual([]);
  expect(validateWeeklyPoolDays(copied)).toBeNull();
});
