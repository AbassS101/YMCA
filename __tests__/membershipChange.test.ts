jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { YMCA_MEMBERSHIP_PLANS } from '@/domain/types';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

describe('YMCA Silver Spring Membership Plan Changing & Features', () => {
  test('YMCA_MEMBERSHIP_PLANS contains all key Silver Spring & YMCA DC tiers', () => {
    const planNames = YMCA_MEMBERSHIP_PLANS.map((p) => p.name);
    expect(planNames).toContain('Adult');
    expect(planNames).toContain('Young Adult');
    expect(planNames).toContain('Senior / Active Older Adult');
    expect(planNames).toContain('Family / Household');
    expect(planNames).toContain('Two Adults');
    expect(planNames).toContain('Community Assistance (Open Doors)');

    // Verify rates
    const adult = YMCA_MEMBERSHIP_PLANS.find((p) => p.id === 'adult');
    expect(adult?.monthlyAmountCents).toBe(8000);

    const youngAdult = YMCA_MEMBERSHIP_PLANS.find((p) => p.id === 'young-adult');
    expect(youngAdult?.monthlyAmountCents).toBe(5400);

    const family = YMCA_MEMBERSHIP_PLANS.find((p) => p.id === 'family');
    expect(family?.monthlyAmountCents).toBe(14500);
    expect(family?.features.some((f) => f.includes('Child Watch'))).toBe(true);

    const assistance = YMCA_MEMBERSHIP_PLANS.find((p) => p.id === 'community-assistance');
    expect(assistance?.monthlyAmountCents).toBe(1750);
  });

  test('changeMembership switches plan from Adult to Family / Household', async () => {
    const api = new MockProtivityAdapter();
    const initialMember = await api.getMember('member-jordan');
    const initialMembership = await api.getMembership('member-jordan');

    expect(initialMember.type).toBe('Adult');
    expect(initialMembership.rateName).toBe('Adult');
    expect(initialMembership.monthlyAmountCents).toBe(8000);

    // Switch to Family / Household ($145.00/mo)
    const updated = await api.changeMembership('member-jordan', 'Family / Household', 14500);

    expect(updated.rateName).toBe('Family / Household');
    expect(updated.monthlyAmountCents).toBe(14500);

    // Member profile type is also updated
    const memberAfter = await api.getMember('member-jordan');
    expect(memberAfter.type).toBe('Family / Household');
  });

  test('changeMembership switches plan to Community Assistance $17.50/mo', async () => {
    const api = new MockProtivityAdapter();

    const updated = await api.changeMembership(
      'member-jordan',
      'Community Assistance (Open Doors)',
      1750
    );

    expect(updated.rateName).toBe('Community Assistance (Open Doors)');
    expect(updated.monthlyAmountCents).toBe(1750);

    const membershipAfter = await api.getMembership('member-jordan');
    expect(membershipAfter.monthlyAmountCents).toBe(1750);
  });

  test('changeMembership throws error when member does not exist', async () => {
    const api = new MockProtivityAdapter();
    await expect(
      api.changeMembership('non-existent-member', 'Family / Household', 14500)
    ).rejects.toThrow('Membership not found: non-existent-member');
  });
});
