function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addCalendarMonths(ymd: string, months: number): string {
  const dt = parseYmd(ymd);
  const day = dt.getUTCDate();
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(day, lastDay));
  return formatYmd(dt);
}

function addDays(ymd: string, days: number): string {
  const dt = parseYmd(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatYmd(dt);
}

export function computeCancelDates(input: {
  nextBillingDate: string;
  requestedAt: string;
  previousBillingDate?: string;
}): { noticeDeadline: string; lastBillDate: string; accessThrough: string } {
  const noticeDeadline = addCalendarMonths(input.nextBillingDate, -1);
  if (input.requestedAt <= noticeDeadline) {
    return {
      noticeDeadline,
      lastBillDate: input.previousBillingDate ?? '',
      accessThrough: addDays(input.nextBillingDate, -1),
    };
  }
  return {
    noticeDeadline,
    lastBillDate: input.nextBillingDate,
    accessThrough: addDays(addCalendarMonths(input.nextBillingDate, 1), -1),
  };
}
