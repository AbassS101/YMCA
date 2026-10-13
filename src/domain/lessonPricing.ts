import type { AquaticsClassOffering } from '@/domain/aquaticsGuideData';
import type { LessonPricing, LessonType, Member, PricingTier } from '@/domain/types';

export const DEFAULT_LESSON_PRICING: LessonPricing = {
  training: { 30: 3500, 60: 6000 },
  swim: { 30: 3500, 60: 6000 },
  swimClassOverrides: {},
};

export function cloneDefaultPricing(): LessonPricing {
  return JSON.parse(JSON.stringify(DEFAULT_LESSON_PRICING)) as LessonPricing;
}

export function normalizePricing(raw?: Partial<LessonPricing> | null): LessonPricing {
  const d = DEFAULT_LESSON_PRICING;
  return {
    training: { ...d.training, ...(raw?.training ?? {}) },
    swim: { ...d.swim, ...(raw?.swim ?? {}) },
    swimClassOverrides: { ...(raw?.swimClassOverrides ?? {}) },
  };
}

export function lessonPriceCents(
  pricing: LessonPricing,
  type: LessonType,
  durationMin: 30 | 60
): number {
  return pricing[type][durationMin];
}

export function pricingTierFor(member?: Pick<Member, 'type'> | null): PricingTier {
  return member?.type === '1-Day Guest Pass' ? 'program' : 'full';
}

export function swimClassPriceCents(
  pricing: LessonPricing,
  offering: Pick<AquaticsClassOffering, 'id' | 'fullMemberPrice' | 'programMemberPrice' | 'isFree'>,
  tier: PricingTier
): number {
  if (offering.isFree) {
    return 0;
  }
  const override = pricing.swimClassOverrides[offering.id];
  const dollars = tier === 'full' ? offering.fullMemberPrice : offering.programMemberPrice;
  if (override) {
    return tier === 'full' ? override.fullCents : override.programCents;
  }
  return dollars * 100;
}

export function formatCents(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Max participants per swim class (not in the guide; used for spots-left). */
export const SWIM_CLASS_CAPACITY = 8;
