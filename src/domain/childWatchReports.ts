import type {
  ChildWatchHeadcount,
  ChildWatchIncident,
  ChildWatchIncidentType,
  ChildWatchVisit,
} from '@/domain/types';

export type ChildWatchReport = {
  visitsPerDay: { date: string; visits: number }[];
  peakOccupancy: number;
  avgStayMin: number;
  /** Completed stays longer than `maxMinutes`. */
  overLimitStays: number;
  incidentsByType: Partial<Record<ChildWatchIncidentType, number>>;
  headcountMismatches: number;
};

function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Summary for visits and incidents on days from..to (inclusive, YYYY-MM-DD, local days).
 * `maxMinutes` is the daily stay limit used to flag over-limit stays (default 120).
 */
export function buildChildWatchReport(
  visits: ChildWatchVisit[],
  incidents: ChildWatchIncident[],
  headcounts: ChildWatchHeadcount[],
  range: { from: string; to: string },
  maxMinutes = 120
): ChildWatchReport {
  const inRange = (iso: string) => {
    const day = localDay(iso);
    return day >= range.from && day <= range.to;
  };
  const vs = visits.filter((v) => inRange(v.signedInAt));

  const perDay = new Map<string, number>();
  for (const v of vs) {
    const day = localDay(v.signedInAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  // Peak occupancy via a sweep over sign-in (+1) and sign-out (-1) events; open visits never leave.
  const events: { t: number; d: number }[] = [];
  for (const v of vs) {
    events.push({ t: new Date(v.signedInAt).getTime(), d: 1 });
    if (v.signedOutAt) events.push({ t: new Date(v.signedOutAt).getTime(), d: -1 });
  }
  events.sort((a, b) => a.t - b.t || a.d - b.d); // sign-outs first on a tie
  let cur = 0;
  let peak = 0;
  for (const e of events) {
    cur += e.d;
    peak = Math.max(peak, cur);
  }

  const stays = vs
    .filter((v) => v.signedOutAt)
    .map((v) => Math.max(0, Math.round((new Date(v.signedOutAt as string).getTime() - new Date(v.signedInAt).getTime()) / 60000)));
  const avgStayMin = stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : 0;

  const incidentsByType: Partial<Record<ChildWatchIncidentType, number>> = {};
  for (const i of incidents.filter((x) => inRange(x.at))) {
    incidentsByType[i.type] = (incidentsByType[i.type] ?? 0) + 1;
  }

  return {
    visitsPerDay: [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, n]) => ({ date, visits: n })),
    peakOccupancy: peak,
    avgStayMin,
    overLimitStays: stays.filter((m) => m > maxMinutes).length,
    incidentsByType,
    headcountMismatches: headcounts.filter((h) => inRange(h.at) && h.counted !== h.expected).length,
  };
}
