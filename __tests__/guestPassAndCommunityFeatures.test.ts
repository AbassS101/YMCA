jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  YMCA_MEMBERSHIP_PLANS,
  YMCA_DONATION_TIERS,
  YMCA_CASE_FOR_SUPPORT_2026,
  YMCA_COMMUNITY_FUNDS,
} from '@/domain/types';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

describe('Guest Screen & Guest Pass Experience', () => {
  test('guest persona exists in seed data with active 1-Day Guest Pass', async () => {
    const api = new MockProtivityAdapter();
    const guestUser = await api.getMember('guest-taylor');

    expect(guestUser).toBeDefined();
    expect(guestUser.name).toBe('Taylor Smith');
    expect(guestUser.type).toBe('1-Day Guest Pass');
    expect(guestUser.membershipId).toBe('GUEST-882194');
    expect(guestUser.status).toBe('active');
  });

  test('guest passes advertise $0 join fee and popular membership plans', () => {
    expect(YMCA_MEMBERSHIP_PLANS.length).toBeGreaterThanOrEqual(4);
    const adult = YMCA_MEMBERSHIP_PLANS.find((p) => p.name === 'Adult');
    const family = YMCA_MEMBERSHIP_PLANS.find((p) => p.name.includes('Family'));
    const assistance = YMCA_MEMBERSHIP_PLANS.find((p) => p.name.includes('Community Assistance'));

    expect(adult).toBeDefined();
    expect(adult?.monthlyAmountCents).toBe(8000); // $80/mo

    expect(family).toBeDefined();
    expect(family?.monthlyAmountCents).toBe(14500); // $145/mo
    expect(family?.features.some((f) => f.includes('Child Watch'))).toBe(true);

    expect(assistance).toBeDefined();
    expect(assistance?.monthlyAmountCents).toBe(1750); // $17.50/mo sliding scale
  });

  test('Case for Support explains the YMCA mission, community needs and why donations are needed', () => {
    expect(YMCA_CASE_FOR_SUPPORT_2026.mission).toContain('spiritual, mental and physical development');
    expect(YMCA_CASE_FOR_SUPPORT_2026.cause).toContain('strengthen community');
    expect(YMCA_CASE_FOR_SUPPORT_2026.cause).toContain('Montgomery County');
    expect(YMCA_CASE_FOR_SUPPORT_2026.commitments.length).toBe(3);

    const commitmentIds = YMCA_CASE_FOR_SUPPORT_2026.commitments.map((c) => c.id);
    expect(commitmentIds).toContain('all');
    expect(commitmentIds).toContain('kids');
    expect(commitmentIds).toContain('health');
  });

  test('donation tiers provide tangible impact breakdowns for community programs', () => {
    // Verify each key tier is present with its clear community impact explanation
    const livestrong = YMCA_DONATION_TIERS.find((t) => t.amountCents === 5000);
    expect(livestrong).toBeDefined();
    expect(livestrong?.title).toContain('LIVESTRONG');
    expect(livestrong?.impactText).toContain('$50');
    expect(livestrong?.impactText).toContain('cancer survivorship');

    const parkinsons = YMCA_DONATION_TIERS.find((t) => t.amountCents === 10000);
    expect(parkinsons).toBeDefined();
    expect(parkinsons?.title).toContain('Parkinson');
    expect(parkinsons?.response).toContain('indoor cycling');
    expect(parkinsons?.impactText).toContain('$100');

    const dayCamp = YMCA_DONATION_TIERS.find((t) => t.amountCents === 17500);
    expect(dayCamp).toBeDefined();
    expect(dayCamp?.title).toContain('Day Camp');
    expect(dayCamp?.impactText).toContain('$175');

    const aquatics = YMCA_DONATION_TIERS.find((t) => t.amountCents === 25000);
    expect(aquatics).toBeDefined();
    expect(aquatics?.title).toContain('Aquatics');
    expect(aquatics?.issue).toContain('drowning is a leading cause');

    const childCare = YMCA_DONATION_TIERS.find((t) => t.amountCents === 50000);
    expect(childCare).toBeDefined();
    expect(childCare?.title).toContain('Child Care');
    expect(childCare?.subtitle).toContain('Working Families');
    expect(childCare?.impactText).toContain('$500');
  });

  test('guest can make a donation and receive official 501(c)(3) receipt with EIN', async () => {
    const api = new MockProtivityAdapter();
    const donation = await api.createDonation({
      memberId: 'guest-taylor',
      donorName: 'Taylor Smith',
      donorEmail: 'guest@silverspring.ymca',
      amountCents: 5000, // $50 LIVESTRONG
      frequency: 'one-time',
      designation: 'LIVESTRONG® at the YMCA (Cancer Survivorship)',
      paymentBrand: 'Mastercard',
      paymentLast4: '8812',
    });

    expect(donation.id).toBeTruthy();
    expect(donation.taxDeductibleId).toBe('53-0196605'); // 501(c)(3) EIN
    expect(donation.amountCents).toBe(5000);
    expect(donation.receiptNumber).toMatch(/^YMCA-2026-\d+$/);

    const guestDonations = await api.listDonations('guest-taylor');
    expect(guestDonations.length).toBeGreaterThanOrEqual(1);
    expect(guestDonations[0].id).toBe(donation.id);
  });
});
