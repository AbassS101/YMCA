import type { PoolScheduleConfig, PoolWeeklyBlock } from './branchContent';
import { allPoolSlots, DAYS_OF_WEEK, getPoolSlots, type PoolDayKey, type PoolId } from './poolScheduleData';

export function editablePoolDay(pool: PoolId, day: PoolDayKey, config: PoolScheduleConfig): PoolWeeklyBlock[] {
  return config.weeklyDays?.[`${pool}:${day}`] ?? getPoolSlots(pool, day, config).map((slot) => ({
    id: slot.id, templateId: slot.id, title: slot.title, startTime: slot.startTime, endTime: slot.endTime,
    lapLanes: slot.lapLanes, recLanes: slot.recLanes, programLanes: slot.programLanes,
    isClosed: slot.isClosed, note: slot.notes ?? '',
  }));
}

export function copyPoolDay(config: PoolScheduleConfig, pool: PoolId, source: PoolDayKey, targets: PoolDayKey[]): PoolScheduleConfig {
  const blocks = editablePoolDay(pool, source, config);
  const weeklyDays = { ...config.weeklyDays };
  for (const target of targets) {
    weeklyDays[`${pool}:${target}`] = blocks.map((block, index) => ({ ...block, id: `${pool}:${target}:${index}` }));
  }
  return { ...config, weeklyDays };
}

function minutes(time: string): number {
  const match = /^(\d{1,2}):([0-5]\d) (AM|PM)$/.exec(time);
  if (!match || +match[1] < 1 || +match[1] > 12) return NaN;
  return (+match[1] % 12) * 60 + +match[2] + (match[3] === 'PM' ? 720 : 0);
}

export function validateWeeklyPoolDays(config: PoolScheduleConfig): string | null {
  for (const [key, blocks] of Object.entries(config.weeklyDays ?? {})) {
    const [pool, day] = key.split(':');
    if (!['indoor', 'outdoor'].includes(pool) || !DAYS_OF_WEEK.some((d) => d.key === day) || key !== `${pool}:${day}`) return 'Unknown pool or day.';
    if (!Array.isArray(blocks)) return 'Pool days must contain time blocks.';
    const ids = new Set<string>();
    const sorted = [...blocks].sort((a, b) => minutes(a.startTime) - minutes(b.startTime));
    let previousEnd = 0;
    for (const block of sorted) {
      if (!block || !block.id || ids.has(block.id)) return 'Each pool time needs a unique ID.';
      ids.add(block.id);
      if (!allPoolSlots(pool as PoolId).some((s) => s.id === block.templateId)) return 'Choose an activity from this pool.';
      if (!block.title?.trim()) return 'Every pool time needs a name.';
      const start = minutes(block.startTime), end = minutes(block.endTime);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 360 || end > 1350 || start >= end) return 'Use times like 6:00 AM, between 6:00 AM and 10:30 PM, with the end after the start.';
      if (start < previousEnd) return `${day}: pool times overlap. Adjust the start or end time.`;
      previousEnd = end;
      const lanes = [block.lapLanes, block.recLanes, block.programLanes];
      if (!lanes.every((n) => Number.isInteger(n) && n >= 0 && n <= 6) || lanes.reduce((a, b) => a + b, 0) > 6) return 'Use whole lane counts totaling no more than six.';
      if (!block.isClosed && lanes.every((n) => n === 0)) return 'Assign at least one lane or mark the time closed.';
      if (typeof block.note !== 'string' || typeof block.isClosed !== 'boolean') return 'Pool notes and closure settings are invalid.';
    }
  }
  return null;
}
