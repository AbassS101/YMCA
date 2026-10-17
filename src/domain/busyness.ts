export type BusyLevel = 'quiet' | 'moderate' | 'busy';

export const OPEN_HOUR = 5;
export const CLOSE_HOUR = 22;

/** Typical occupancy (0-100) for each open hour, 5am through 9pm. */
const WEEKDAY = [45, 70, 60, 40, 30, 25, 30, 35, 30, 35, 50, 75, 90, 95, 80, 55, 30];
const FRIDAY = [35, 55, 50, 40, 30, 25, 30, 30, 25, 25, 35, 50, 55, 50, 40, 25, 15];
const SATURDAY = [10, 15, 30, 55, 65, 60, 50, 40, 35, 30, 25, 20, 15, 10, 10, 5, 5];
const SUNDAY = [5, 10, 20, 35, 50, 55, 50, 45, 40, 35, 40, 45, 40, 30, 20, 15, 10];

/** Index 0 = Sunday, matching Date#getDay(). */
const BY_DAY: number[][] = [SUNDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, FRIDAY, SATURDAY];

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

export function getBusyHours(dayIndex: number): BusyHour[] {
  return BY_DAY[dayIndex].map((value, i) => {
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
