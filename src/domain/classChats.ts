import type { ScheduleCategory, ScheduleItem } from '@/domain/types';

/**
 * A class chat belongs to the class (title + instructor), not to a single
 * dated session, so every occurrence of a recurring class shares one chat.
 */
export type ClassChatGroup = {
  key: string;
  title: string;
  instructorName: string;
  location: string;
  category: ScheduleCategory;
  /** Every schedule item id that feeds this chat; sorted, ids[0] is canonical for new posts. */
  ids: string[];
  /** Next upcoming session (or the most recent one when none are upcoming). */
  next: ScheduleItem;
  sessionCount: number;
  /** Weekday indexes (0 = Sun) on which the class meets. */
  weekdays: number[];
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function classChatKey(item: Pick<ScheduleItem, 'title' | 'instructorName'>): string {
  return `${item.title.trim().toLowerCase()}|${item.instructorName.trim().toLowerCase()}`;
}

export function groupClassChats(items: ScheduleItem[], now: Date = new Date()): ClassChatGroup[] {
  const nowMs = now.getTime();
  const byKey = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = classChatKey(item);
    const list = byKey.get(key);
    if (list) list.push(item);
    else byKey.set(key, [item]);
  }

  const groups: ClassChatGroup[] = [];
  for (const [key, sessions] of byKey) {
    const sorted = [...sessions].sort((a, b) => a.start.localeCompare(b.start));
    const next = sorted.find((s) => new Date(s.end).getTime() >= nowMs) ?? sorted[sorted.length - 1];
    const weekdays = Array.from(new Set(sorted.map((s) => new Date(s.start).getDay()))).sort(
      (a, b) => a - b
    );
    groups.push({
      key,
      title: next.title,
      instructorName: next.instructorName,
      location: next.location,
      category: next.category,
      ids: sorted.map((s) => s.id).sort(),
      next,
      sessionCount: sorted.length,
      weekdays,
    });
  }
  return groups.sort((a, b) => a.title.localeCompare(b.title));
}

export function findClassChatGroup(groups: ClassChatGroup[], classId: string): ClassChatGroup | undefined {
  return groups.find((g) => g.ids.includes(classId));
}

export function weekdaysLabel(weekdays: number[]): string {
  if (weekdays.length === 0) return '';
  if (weekdays.length === 7) return 'Daily';
  return weekdays.map((d) => WEEKDAY_SHORT[d]).join(' · ');
}

export const CLASS_CATEGORY_LABEL: Record<ScheduleCategory, string> = {
  groupEx: 'Group Ex',
  swim: 'Aquatics',
  seniors: 'Active Older Adults',
  event: 'Events',
};

export const CLASS_CATEGORY_COLOR: Record<ScheduleCategory, string> = {
  groupEx: '#00609C',
  swim: '#00838F',
  seniors: '#7C3AED',
  event: '#D97706',
};
