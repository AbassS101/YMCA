import { defaultAppConfig, fillTemplate } from '@/domain/appConfig';
import type { DeskAlertKind } from '@/domain/deskAlerts';
import type { EnrollmentCampaign, Lead } from '@/domain/types';

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

/** Suggested talk track for a billing call. */
export function billingCallScript(input: {
  memberName: string;
  kind: Extract<DeskAlertKind, 'card_declined' | 'past_due'>;
  amountDueCents: number;
  repName: string;
  reason?: string;
}): string {
  const due = `$${(input.amountDueCents / 100).toFixed(2)}`;
  const opener = `Hi ${firstName(input.memberName)}, this is ${input.repName} from the YMCA Silver Spring membership team.`;
  const issue =
    input.kind === 'card_declined'
      ? `We noticed your most recent membership payment of ${due} was declined${input.reason ? ` (${input.reason.toLowerCase()})` : ''}.`
      : `Your membership account has a past-due balance of ${due}.`;
  return [
    opener,
    issue,
    'Nothing to worry about, this happens often. Do you have a minute to update your payment method? You can also stop by the front desk anytime.',
    'Before we hang up: is there anything else about your membership I can help with?',
  ].join('\n\n');
}

/** Suggested talk track for a sales / enrollment call. */
export function salesCallScript(input: {
  lead: Pick<Lead, 'name' | 'source'>;
  repName: string;
  campaign?: EnrollmentCampaign | null;
  planName?: string;
}): string {
  const opener = `Hi ${firstName(input.lead.name)}, this is ${input.repName} from the YMCA Silver Spring.`;
  const why =
    input.lead.source === 'guest_pass'
      ? 'Thanks for visiting with a guest pass. How did you like the facility?'
      : input.lead.source === 'lapsed_member'
        ? 'We would love to welcome you back to the Y.'
        : 'Thanks for your interest in the Y.';
  const promo = input.campaign
    ? input.campaign.waiveEnrollmentFee
      ? `Right now, through ${input.campaign.endDate}, we are waiving the one-time enrollment fee on ${input.planName ?? 'new memberships'} (${input.campaign.name}).`
      : `Right now, through ${input.campaign.endDate}, we are taking ${input.campaign.enrollmentFeeDiscountPct ?? 0}% off the enrollment fee (${input.campaign.name}).`
    : 'I can walk you through our membership options and find the best fit.';
  return [
    opener,
    why,
    promo,
    'Would you like to get started today? I can set it up over the phone, or we can finish at the front desk.',
  ].join('\n\n');
}

/** `template` is the configured welcome call script (config.templates.welcomeCall). */
export function welcomeCallScript(
  input: { memberName: string; repName: string },
  template: string = defaultAppConfig().templates.welcomeCall
): string {
  return fillTemplate(template, { firstName: firstName(input.memberName), repName: input.repName });
}
