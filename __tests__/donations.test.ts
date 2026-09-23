jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { YMCA_COMMUNITY_FUNDS, YMCA_DONATION_TIERS } from '@/domain/types';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

describe('YMCA Charitable Donations: 501(c)(3) Giving & Tax Receipts', () => {
  test('YMCA_DONATION_TIERS and YMCA_COMMUNITY_FUNDS contain community programs', () => {
    expect(YMCA_DONATION_TIERS.length).toBe(6);
    const amounts = YMCA_DONATION_TIERS.map((t) => t.amountCents);
    expect(amounts).toContain(5000);
    expect(amounts).toContain(10000);
    expect(amounts).toContain(17500);
    expect(amounts).toContain(25000);
    expect(amounts).toContain(50000);
    expect(amounts).toContain(100000);

    const fundNames = YMCA_COMMUNITY_FUNDS.map((f) => f.name);
    expect(fundNames.some((n) => n.includes('Annual Community Campaign'))).toBe(true);
    expect(fundNames.some((n) => n.includes('Making the Y Available to All'))).toBe(true);
    expect(fundNames.some((n) => n.includes('LIVESTRONG'))).toBe(true);
    expect(fundNames.some((n) => n.includes('Pedaling for Parkinson'))).toBe(true);
    expect(fundNames.some((n) => n.includes('Day Camp'))).toBe(true);
    expect(fundNames.some((n) => n.includes('Aquatics'))).toBe(true);
    expect(fundNames.some((n) => n.includes('Child Care'))).toBe(true);
  });

  test('createDonation processes one-time gift with official 501(c)(3) tax receipt', async () => {
    const api = new MockProtivityAdapter();
    const donation = await api.createDonation({
      memberId: 'member-jordan',
      donorName: 'Jordan Hale',
      donorEmail: 'jordan@silverspring.ymca',
      amountCents: 10000, // $100
      frequency: 'one-time',
      designation: 'Making the Y Available to All (Financial Assistance)',
      paymentBrand: 'Visa',
      paymentLast4: '4242',
    });

    expect(donation.id).toBeTruthy();
    expect(donation.amountCents).toBe(10000);
    expect(donation.frequency).toBe('one-time');
    expect(donation.designation).toBe('Making the Y Available to All (Financial Assistance)');
    expect(donation.taxDeductibleId).toBe('53-0196605');
    expect(donation.receiptNumber).toMatch(/^YMCA-2026-\d+$/);

    // Verify giving history
    const history = await api.listDonations('member-jordan');
    expect(history.some((d) => d.id === donation.id)).toBe(true);

    // Verify confirmation notification
    const notifs = await api.listNotifications('member-jordan');
    const donNotif = notifs.find((n) => n.title.includes('Thank You for Your Donation'));
    expect(donNotif).toBeDefined();
    expect(donNotif?.body).toContain('$100.00');
    expect(donNotif?.body).toContain(donation.receiptNumber);
  });

  test('createDonation supports tribute / in-honor dedication and monthly frequency', async () => {
    const api = new MockProtivityAdapter();
    const donation = await api.createDonation({
      memberId: 'member-jordan',
      donorName: 'Jordan Hale',
      donorEmail: 'jordan@silverspring.ymca',
      amountCents: 5000, // $50/mo
      frequency: 'monthly',
      designation: 'LIVESTRONG® at the YMCA (Cancer Survivorship)',
      dedication: {
        tributeType: 'honor',
        name: 'Coach Emily Wilson',
        message: 'Thank you for coaching our youth with patience and passion.',
      },
      paymentBrand: 'Visa',
      paymentLast4: '4242',
    });

    expect(donation.frequency).toBe('monthly');
    expect(donation.dedication).toBeDefined();
    expect(donation.dedication?.tributeType).toBe('honor');
    expect(donation.dedication?.name).toBe('Coach Emily Wilson');
    expect(donation.taxDeductibleId).toBe('53-0196605');
  });
});
