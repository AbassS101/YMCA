/**
 * Salesforce-ready CSV exports (Data Import Wizard / Data Loader).
 *
 * Standard objects: Contact, Lead, Opportunity. The YMCA Salesforce admin creates the `__c`
 * custom fields/objects once:
 *  - Contact: External_Id__c (ext id), Membership_Status__c, Membership_Type__c, Household_Id__c,
 *    Join_Date__c, Cancel_Date__c, Monthly_Rate__c
 *  - Lead: External_Id__c, Next_Follow_Up__c
 *  - Opportunity: External_Id__c, Designation__c, Frequency__c, Receipt_Number__c
 *  - YMCA_Daily_Stat__c, YMCA_Monthly_Retention__c, YMCA_Department_Stat__c,
 *    Child_Watch_Visit__c, Child_Watch_Incident__c, Child_Watch_Daily__c
 *
 * Child Watch exports carry child and household IDs only: never names, allergies, notes, pickup
 * codes or hashes, emergency phones, or incident descriptions.
 */
import { toCsv, type CsvColumn } from '@/export/csv';
import { daysInRange, isActiveOn } from '@/domain/stats/retention';
import type { BranchStats } from '@/domain/stats/branchStats';
import type { ChildWatchStats } from '@/domain/stats/childWatchStats';
import type { StatsScope } from '@/domain/stats/statsScopes';
import type { BranchRaw, ChildWatchRaw, StatsRange } from '@/repositories/statsRepo';

export type ExportKey =
  | 'contacts'
  | 'leads'
  | 'donations'
  | 'dailyStats'
  | 'monthlyRetention'
  | 'childWatchVisits'
  | 'childWatchIncidents'
  | 'childWatchDaily'
  | 'departmentDaily';

export type ExportData = {
  branch?: { raw: BranchRaw; stats: BranchStats };
  childWatch?: { raw: ChildWatchRaw; stats: ChildWatchStats };
  /** Stats objects keyed by department name (e.g. 'Aquatics'); numeric fields are exported. */
  departments?: Record<string, object>;
};

export const EXPORT_DEFS: Record<ExportKey, { label: string; sfObject: string; scopes: StatsScope[]; containsPII: boolean }> = {
  contacts: { label: 'Members (Contacts)', sfObject: 'Contact', scopes: ['branch', 'membership'], containsPII: true },
  leads: { label: 'Leads', sfObject: 'Lead', scopes: ['branch', 'membership'], containsPII: true },
  donations: { label: 'Donations', sfObject: 'Opportunity', scopes: ['branch', 'membership'], containsPII: true },
  dailyStats: { label: 'Daily branch stats', sfObject: 'YMCA_Daily_Stat__c', scopes: ['branch'], containsPII: false },
  monthlyRetention: { label: 'Monthly retention', sfObject: 'YMCA_Monthly_Retention__c', scopes: ['branch', 'membership'], containsPII: false },
  childWatchVisits: { label: 'Child Watch visits', sfObject: 'Child_Watch_Visit__c', scopes: ['childWatch'], containsPII: false },
  childWatchIncidents: { label: 'Child Watch incidents', sfObject: 'Child_Watch_Incident__c', scopes: ['childWatch'], containsPII: false },
  childWatchDaily: { label: 'Child Watch daily', sfObject: 'Child_Watch_Daily__c', scopes: ['childWatch'], containsPII: false },
  departmentDaily: { label: 'Department metrics', sfObject: 'YMCA_Department_Stat__c', scopes: ['aquatics', 'wellness', 'membership'], containsPII: false },
};

export function exportsForScopes(scopes: StatsScope[]): ExportKey[] {
  return (Object.keys(EXPORT_DEFS) as ExportKey[]).filter((k) => EXPORT_DEFS[k].scopes.some((s) => scopes.includes(s)));
}

const BRANCH = 'Silver Spring';

const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const minutesBetween = (a: string, b?: string): number | '' =>
  b ? Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000)) : '';
const hhmm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? (parts.pop() as string) : parts[0] ?? '';
  return { first: parts.length ? parts.join(' ') : '', last };
};
const dollars = (cents: number) => (cents / 100).toFixed(2);
const inRange = (iso: string, r: StatsRange) => {
  const d = iso.slice(0, 10);
  return d >= r.from && d <= r.to;
};

type Out = { rows: unknown[]; columns: CsvColumn<never>[] };

function out<T>(rows: T[], columns: CsvColumn<T>[]): Out {
  return { rows, columns: columns as unknown as CsvColumn<never>[] };
}

const LEAD_SOURCE_LABEL: Record<string, string> = {
  walk_in: 'Walk-in',
  guest_pass: 'Guest Pass',
  lapsed_member: 'Lapsed Member',
  referral: 'Referral',
  phone: 'Phone',
  web: 'Web',
};
const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'Open - Not Contacted',
  contacted: 'Working - Contacted',
  tour_scheduled: 'Working - Tour Scheduled',
  follow_up: 'Working - Follow Up',
  won: 'Closed - Converted',
  lost: 'Closed - Not Converted',
};

function mapping(key: ExportKey, data: ExportData, range: StatsRange): Out {
  const branch = data.branch;
  const cw = data.childWatch;
  switch (key) {
    case 'contacts': {
      const ms = new Map((branch?.raw.memberships ?? []).map((m) => [m.memberId, m]));
      return out(branch?.raw.members ?? [], [
        { header: 'External_Id__c', value: (m) => m.id },
        { header: 'FirstName', value: (m) => splitName(m.name).first },
        { header: 'LastName', value: (m) => splitName(m.name).last },
        { header: 'Email', value: (m) => m.email },
        { header: 'Phone', value: (m) => m.phone },
        { header: 'MailingStreet', value: (m) => m.address },
        { header: 'Birthdate', value: (m) => m.birthDate },
        { header: 'Membership_Status__c', value: (m) => ms.get(m.id)?.status ?? m.status },
        { header: 'Membership_Type__c', value: (m) => m.type },
        { header: 'Household_Id__c', value: (m) => m.householdId },
        { header: 'Join_Date__c', value: (m) => ms.get(m.id)?.joinedDate },
        { header: 'Cancel_Date__c', value: (m) => ms.get(m.id)?.cancelEffectiveDate },
        { header: 'Monthly_Rate__c', value: (m) => (ms.has(m.id) ? dollars(ms.get(m.id)!.monthlyAmountCents) : '') },
      ]);
    }
    case 'leads':
      return out(branch?.raw.leads ?? [], [
        { header: 'External_Id__c', value: (l) => l.id },
        { header: 'FirstName', value: (l) => splitName(l.name).first },
        { header: 'LastName', value: (l) => splitName(l.name).last },
        { header: 'Email', value: (l) => l.email },
        { header: 'Phone', value: (l) => l.phone },
        { header: 'LeadSource', value: (l) => LEAD_SOURCE_LABEL[l.source] ?? l.source },
        { header: 'Status', value: (l) => LEAD_STATUS_LABEL[l.status] ?? l.status },
        { header: 'Next_Follow_Up__c', value: (l) => l.nextFollowUpDate },
        { header: 'Company', value: () => 'Household' },
      ]);
    case 'donations':
      return out((branch?.raw.donations ?? []).filter((d) => inRange(d.createdAt, range)), [
        { header: 'External_Id__c', value: (d) => d.id },
        { header: 'Name', value: (d) => `${d.donorName} - ${d.designation}` },
        { header: 'Amount', value: (d) => dollars(d.amountCents) },
        { header: 'CloseDate', value: (d) => d.createdAt.slice(0, 10) },
        { header: 'StageName', value: () => 'Closed Won' },
        { header: 'Designation__c', value: (d) => d.designation },
        { header: 'Frequency__c', value: (d) => d.frequency },
        { header: 'Receipt_Number__c', value: (d) => d.receiptNumber },
      ]);
    case 'dailyStats': {
      const guestIds = new Set((branch?.raw.members ?? []).filter((m) => m.type === '1-Day Guest Pass').map((m) => m.id));
      const ms = (branch?.raw.memberships ?? []).filter((m) => !guestIds.has(m.memberId));
      const visitors = new Map((branch?.stats.dailyVisitors ?? []).map((d) => [d.date, d.value]));
      const days = daysInRange(range.from, range.to).map((date) => ({
        date,
        visitors: visitors.get(date) ?? 0,
        joins: ms.filter((m) => m.joinedDate === date).length,
        cancels: ms.filter((m) => m.cancelEffectiveDate === date).length,
        active: ms.filter((m) => isActiveOn(m, date)).length,
        cw: (cw?.raw.visits ?? []).filter((v) => localDay(v.signedInAt) === date).length,
      }));
      return out(days, [
        { header: 'Date__c', value: (r) => r.date },
        { header: 'Branch__c', value: () => BRANCH },
        { header: 'Unique_Visitors__c', value: (r) => r.visitors },
        { header: 'New_Joins__c', value: (r) => r.joins },
        { header: 'Cancellations__c', value: (r) => r.cancels },
        { header: 'Active_Members__c', value: (r) => r.active },
        { header: 'Child_Watch_Visits__c', value: (r) => r.cw },
      ]);
    }
    case 'monthlyRetention':
      return out(branch?.stats.monthly ?? [], [
        { header: 'Month__c', value: (r) => r.month },
        { header: 'Branch__c', value: () => BRANCH },
        { header: 'Start_Active__c', value: (r) => r.startActive },
        { header: 'Retained__c', value: (r) => r.retained },
        { header: 'Retention_Pct__c', value: (r) => r.retentionPct },
        { header: 'Churn_Pct__c', value: (r) => r.churnPct },
        { header: 'New_Joins__c', value: (r) => r.newJoins },
      ]);
    case 'childWatchVisits':
      return out(cw?.raw.visits ?? [], [
        { header: 'External_Id__c', value: (v) => v.id },
        { header: 'Child_Id__c', value: (v) => v.childId },
        { header: 'Household_Id__c', value: (v) => v.memberId },
        { header: 'Signed_In__c', value: (v) => v.signedInAt },
        { header: 'Signed_Out__c', value: (v) => v.signedOutAt },
        { header: 'Minutes__c', value: (v) => minutesBetween(v.signedInAt, v.signedOutAt) },
        { header: 'Verification__c', value: (v) => v.verification },
      ]);
    case 'childWatchIncidents':
      return out(cw?.raw.incidents ?? [], [
        { header: 'External_Id__c', value: (i) => i.id },
        { header: 'Child_Id__c', value: (i) => i.childId },
        { header: 'Household_Id__c', value: (i) => i.householdId },
        { header: 'Type__c', value: (i) => i.type },
        { header: 'Severity__c', value: (i) => i.severity },
        { header: 'Occurred__c', value: (i) => i.at },
        { header: 'Status__c', value: (i) => i.status },
        { header: 'Parent_Notified__c', value: (i) => Boolean(i.parentNotifiedAt) },
        { header: 'Parent_Acknowledged__c', value: (i) => Boolean(i.parentAcknowledgedAt) },
      ]);
    case 'childWatchDaily': {
      const visits = cw?.raw.visits ?? [];
      const incidents = cw?.raw.incidents ?? [];
      const shifts = cw?.raw.shifts ?? [];
      const rows = (cw?.stats.visitsPerDay ?? []).map(({ date, visits: n }) => {
        const stays = visits
          .filter((v) => localDay(v.signedInAt) === date)
          .map((v) => minutesBetween(v.signedInAt, v.signedOutAt))
          .filter((m): m is number => typeof m === 'number');
        return {
          date,
          visits: n,
          avgStay: stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : 0,
          incidents: incidents.filter((i) => localDay(i.at) === date).length,
          staffHours:
            shifts.filter((s) => s.date === date).reduce((h, s) => h + Math.max(0, hhmm(s.end) - hhmm(s.start)) / 60, 0),
        };
      });
      // Peak occupancy, over-limit stays, and ratio-violation minutes are range-level in the stats domain.
      return out(rows, [
        { header: 'Date__c', value: (r) => r.date },
        { header: 'Visits__c', value: (r) => r.visits },
        { header: 'Peak_Occupancy__c', value: () => cw?.stats.peakOccupancy ?? 0 },
        { header: 'Avg_Stay_Min__c', value: (r) => r.avgStay },
        { header: 'Over_Limit__c', value: () => cw?.stats.overLimitStays ?? 0 },
        { header: 'Incidents__c', value: (r) => r.incidents },
        { header: 'Ratio_Violation_Min__c', value: () => cw?.stats.ratioViolationMinutes ?? 0 },
        { header: 'Staff_Hours__c', value: (r) => Math.round(r.staffHours * 10) / 10 },
      ]);
    }
    case 'departmentDaily': {
      const rows: { department: string; metric: string; value: number }[] = [];
      for (const [department, stats] of Object.entries(data.departments ?? {})) {
        for (const [metric, value] of Object.entries(stats)) {
          if (typeof value === 'number' && Number.isFinite(value)) rows.push({ department, metric, value });
        }
      }
      return out(rows, [
        { header: 'Date__c', value: () => range.to },
        { header: 'Department__c', value: (r) => r.department },
        { header: 'Metric__c', value: (r) => r.metric },
        { header: 'Value__c', value: (r) => r.value },
      ]);
    }
  }
}

export function buildExport(
  key: ExportKey,
  data: ExportData,
  range: StatsRange
): { filename: string; csv: string; rowCount: number } {
  const { rows, columns } = mapping(key, data, range);
  return {
    filename: `ymca-silver-spring_${key}_${range.from}_${range.to}.csv`,
    csv: toCsv(rows as never[], columns),
    rowCount: rows.length,
  };
}
