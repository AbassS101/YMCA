import { CLOSE_HOUR, DEFAULT_BUSY_TIMES, OPEN_HOUR } from '@/domain/branchContent';

export { CLOSE_HOUR, OPEN_HOUR };

export type BusyLevel = 'quiet' | 'moderate' | 'busy';

export interface BusyHour {
  hour: number;
  label: string;
  value: number;
  level: BusyLevel;
}

export function levelFor(value: number): BusyLevel {
  if (value >= 70) return 'busy';
  if (value >= 40) return 'moderate';
  return 'quiet';
}

export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'a' : 'p'}`;
}

/** `byDay` comes from the busy-times settings (row 0 = Sunday); defaults to the standard pattern. */
export function getBusyHours(dayIndex: number, byDay: number[][] = DEFAULT_BUSY_TIMES.byDay): BusyHour[] {
  return (byDay[dayIndex] ?? []).map((value, i) => {
    const hour = OPEN_HOUR + i;
    return { hour, label: formatHour(hour), value, level: levelFor(value) };
  });
}

export function isOpenAt(hour: number): boolean {
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR;
}

/** Hours (today only) sorted by quietest first, from `fromHour` onward. */
export function quietestHours(hours: BusyHour[], fromHour: number, count = 3): BusyHour[] {
  return hours
    .filter((h) => h.hour >= fromHour)
    .sort((a, b) => a.value - b.value || a.hour - b.hour)
    .slice(0, count)
    .sort((a, b) => a.hour - b.hour);
}
