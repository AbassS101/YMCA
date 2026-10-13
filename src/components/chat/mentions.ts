/** Maps @tags in free text to staff ids (kept in sync with MentionAutocomplete candidates). */
export function parseMentionedStaffIds(text: string): string[] {
  const lower = text.toLowerCase();
  const has = (...tags: string[]) => tags.some((t) => lower.includes(t));
  const ids: string[] = [];
  if (has('@alex', '@doc', '@staff-alex')) ids.push('staff-alex');
  if (has('@sarah', '@jane doe', '@janedoe', '@staff-sarah')) ids.push('staff-sarah');
  if (has('@celine', '@staff-celine')) ids.push('staff-celine');
  if (has('@marcus', '@billy', '@desk', '@staff-desk')) ids.push('staff-desk');
  if (has('@david', '@abass', '@it', '@staff-itadmin')) ids.push('staff-itadmin');
  if (has('@jane', '@patricia', '@pat', '@david', '@staff-admin')) ids.push('staff-admin');
  if (has('@all staff', '@allstaff', '@staff-all')) ids.push('staff-all');
  return Array.from(new Set(ids));
}
