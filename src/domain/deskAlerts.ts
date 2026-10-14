import type { Member, Membership } from '@/domain/types';

export type DeskAlertKind =
  | 'card_declined'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'cancel_pending'
  | 'guest_pass_expired'
  | 'guest_pass'
  | 'new_member';

export type DeskAlert = {
  kind: DeskAlertKind;
  label: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  /** Blocking alerts ask the rep to confirm before checking the member in. */
  blocking: boolean;
};

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 } as const;
const GUEST_PLAN = '1-Day Guest Pass';
export const NEW_MEMBER_DAYS = 14;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T12:00:00`).getTime();
  const to = new Date(`${toIso.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function deskAlertsFor(
  member: Member,
  membership: Membership | null | undefined,
  today: string,
  newMemberDays: number = NEW_MEMBER_DAYS
): DeskAlert[] {
  const alerts: DeskAlert[] = [];

  if (member.status === 'cancelled') {
    alerts.push({ kind: 'cancelled', label: 'CANCELLED', detail: 'Membership is cancelled. Offer to re-enroll.', severity: 'critical', blocking: true });
  }
  if (member.status === 'paused') {
    alerts.push({ kind: 'paused', label: 'PAUSED', detail: 'Membership is on hold.', severity: 'warning', blocking: true });
  }
  if (member.status === 'cancel_pending') {
    alerts.push({
      kind: 'cancel_pending',
      label: 'CANCEL PENDING',
      detail: membership?.cancelEffectiveDate ? `Access through ${membership.cancelEffectiveDate}.` : 'Cancellation requested.',
      severity: 'warning',
      blocking: false,
    });
  }

  if (membership?.billingStatus === 'declined') {
    const due = ((membership.billingIssue?.amountDueCents ?? 0) / 100).toFixed(2);
    alerts.push({
      kind: 'card_declined',
      label: 'CARD DECLINED',
      detail: `${membership.billingIssue?.reason ?? 'Payment declined'}. $${due} due.`,
      severity: 'critical',
      blocking: true,
    });
  } else if (membership?.billingStatus === 'past_due') {
    const due = ((membership.billingIssue?.amountDueCents ?? 0) / 100).toFixed(2);
    alerts.push({ kind: 'past_due', label: 'PAST DUE', detail: `$${due} past due.`, severity: 'critical', blocking: true });
  }

  if (member.type === GUEST_PLAN) {
    const expired = membership?.nextBillingDate !== undefined && membership.nextBillingDate < today;
    alerts.push(
      expired
        ? { kind: 'guest_pass_expired', label: 'PASS EXPIRED', detail: 'Guest pass has expired. Offer a membership.', severity: 'warning', blocking: true }
        : { kind: 'guest_pass', label: 'GUEST', detail: 'Guest pass. Offer a membership (enrollment fee waived).', severity: 'info', blocking: false }
    );
  } else if (membership?.joinedDate) {
    const age = daysBetween(membership.joinedDate, today);
    if (age >= 0 && age <= newMemberDays) {
      alerts.push({ kind: 'new_member', label: 'NEW MEMBER', detail: 'Joined recently. Offer a welcome tour.', severity: 'info', blocking: false });
    }
  }

  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function hasBlockingAlert(alerts: DeskAlert[]): boolean {
  return alerts.some((a) => a.blocking);
}
