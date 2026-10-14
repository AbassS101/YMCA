import {
  effectiveEnrollmentFeeCents,
  type EnrollmentCampaign,
  type MembershipPlan,
} from '@/domain/types';

export function isCampaignRunning(campaign: EnrollmentCampaign, date: string): boolean {
  return campaign.active && date >= campaign.startDate && date <= campaign.endDate;
}

/** Best running campaign for a date (and plan, if given). Prefers a full waiver, then the biggest discount. */
export function activeCampaignFor(
  date: string,
  planId: string | undefined,
  campaigns: EnrollmentCampaign[]
): EnrollmentCampaign | null {
  const running = campaigns.filter((c) => {
    if (!isCampaignRunning(c, date)) return false;
    if (!planId || !c.eligiblePlanIds || c.eligiblePlanIds.length === 0) return true;
    return c.eligiblePlanIds.includes(planId);
  });
  if (running.length === 0) return null;
  const score = (c: EnrollmentCampaign) => (c.waiveEnrollmentFee ? 101 : c.enrollmentFeeDiscountPct ?? 0);
  return [...running].sort((a, b) => score(b) - score(a))[0];
}

export function campaignEnrollmentFeeCents(
  plan: MembershipPlan,
  campaign: EnrollmentCampaign | null | undefined,
  options?: { waiveEnrollmentFee?: boolean }
): number {
  return effectiveEnrollmentFeeCents(plan, { waiveEnrollmentFee: options?.waiveEnrollmentFee, campaign });
}

export function campaignHeadline(campaign: EnrollmentCampaign): string {
  const end = campaign.endDate;
  if (campaign.waiveEnrollmentFee) return `${campaign.name}: enrollment fee waived through ${end}`;
  if (campaign.enrollmentFeeDiscountPct) {
    return `${campaign.name}: ${campaign.enrollmentFeeDiscountPct}% off enrollment fee through ${end}`;
  }
  return `${campaign.name} through ${end}`;
}
