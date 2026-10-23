import { addDaysToDate, easternOffset, getDemoToday } from '@/domain/demoClock';
import type { PoolDayKey, PoolTimeSlot } from '@/domain/poolScheduleData';

const WEEKDAYS: PoolDayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function poolDayForDate(date: string): PoolDayKey {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

/** Calendar exports follow the selected date, or the next occurrence of a weekly slot. */
export function poolSlotTimes(slot: PoolTimeSlot, date?: string): { startIso: string; endIso: string } {
  const today = getDemoToday();
  const daysAhead = (WEEKDAYS.indexOf(slot.day) - WEEKDAYS.indexOf(poolDayForDate(today)) + 7) % 7;
  const eventDate = date ?? addDaysToDate(today, daysAhead);
  const time = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    return `${eventDate}T${String(hour).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00${easternOffset(eventDate, hour)}`;
  };
  return { startIso: time(slot.startMinutes), endIso: time(slot.endMinutes) };
}
