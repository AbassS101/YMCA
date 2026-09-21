jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

describe('YMCA Membership Management: Buy, Schedule Next Month, Cancel & Rescind', () => {
  test('buyMembership creates new active member, membership, credentials, and welcome notification', async () => {
    const api = new MockProtivityAdapter();
    const result = await api.buyMembership({
      name: 'Morgan Taylor',
      email: 'morgan.taylor@example.com',
      phone: '(301) 555-9876',
      address: '456 Colesville Rd, Silver Spring, MD',
      planId: 'family',
      payment: { brand: 'Mastercard', last4: '5555' },
    });

    expect(result.member.name).toBe('Morgan Taylor');
    expect(result.member.email).toBe('morgan.taylor@example.com');
    expect(result.member.type).toBe('Family / Household');
    expect(result.member.status).toBe('active');
    expect(result.member.membershipId).toBeTruthy();

    expect(result.membership.rateName).toBe('Family / Household');
    expect(result.membership.monthlyAmountCents).toBe(14500);
    expect(result.membership.paymentBrand).toBe('Mastercard');
    expect(result.membership.paymentLast4).toBe('5555');

    // Verify login credentials work
    const session = await api.login('morgan.taylor@example.com', 'ymca-demo');
    expect(session.userId).toBe(result.member.id);
    expect(session.role).toBe('member');

    // Verify welcome notification was created
    const notifs = await api.listNotifications(result.member.id);
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs.some((n) => n.title.includes('Welcome to YMCA'))).toBe(true);
  });

  test('buyMembership with optional community donation adds donation record', async () => {
    const api = new MockProtivityAdapter();
    const result = await api.buyMembership({
      name: 'Casey Quinn',
      email: 'casey@example.com',
      phone: '(301) 555-1122',
      address: '789 Wayne Ave, Silver Spring, MD',
      planId: 'young-adult',
      payment: { brand: 'Visa', last4: '1111' },
      donationCents: 1000, // +$10/mo donation
    });

    expect(result.member.type).toBe('Young Adult');
    const donations = await api.listDonations(result.member.id);
    expect(donations.length).toBe(1);
    expect(donations[0].amountCents).toBe(1000);
    expect(donations[0].frequency).toBe('monthly');
    expect(donations[0].taxDeductibleId).toBe('53-0196605');
  });

  test('scheduleMembershipChange records pendingChange for next billing cycle and sends notification', async () => {
    const api = new MockProtivityAdapter();
    const initial = await api.getMembership('member-jordan');
    expect(initial.rateName).toBe('Adult');
    expect(initial.monthlyAmountCents).toBe(8000);

    const updated = await api.scheduleMembershipChange(
      'member-jordan',
      'Senior / Active Older Adult',
      6800,
      '2026-10-12'
    );

    // Current plan remains unchanged until next month
    expect(updated.rateName).toBe('Adult');
    expect(updated.monthlyAmountCents).toBe(8000);

    // Pending change is recorded
    expect(updated.pendingChange).toBeDefined();
    expect(updated.pendingChange?.planName).toBe('Senior / Active Older Adult');
    expect(updated.pendingChange?.monthlyAmountCents).toBe(6800);
    expect(updated.pendingChange?.effectiveDate).toBe('2026-10-12');

    // Notification is dispatched
    const notifs = await api.listNotifications('member-jordan');
    const scheduledNotif = notifs.find((n) => n.title.includes('Membership Change Scheduled'));
    expect(scheduledNotif).toBeDefined();
    expect(scheduledNotif?.body).toContain('Senior / Active Older Adult');
  });

  test('cancelScheduledChange removes pendingChange and dispatches notice', async () => {
    const api = new MockProtivityAdapter();
    await api.scheduleMembershipChange('member-jordan', 'Family / Household', 14500, '2026-10-12');

    const cancelled = await api.cancelScheduledChange('member-jordan');
    expect(cancelled.pendingChange).toBeUndefined();
    expect(cancelled.rateName).toBe('Adult');

    const notifs = await api.listNotifications('member-jordan');
    expect(notifs.some((n) => n.title.includes('Scheduled Plan Change Cancelled'))).toBe(true);
  });

  test('rescindCancelNotice restores member to active and clears cancellation schedule', async () => {
    const api = new MockProtivityAdapter();

    // 1. Submit cancellation notice
    await api.submitCancelNotice('member-jordan', {
      reason: 'Moving away temporarily',
      requestedAt: '2026-09-14',
    });

    const memberPending = await api.getMember('member-jordan');
    expect(memberPending.status).toBe('cancel_pending');

    const pendingCancels = await api.listPendingCancels('silver-spring');
    expect(pendingCancels.some((c) => c.memberId === 'member-jordan')).toBe(true);

    // 2. Rescind cancellation
    const memberRestored = await api.rescindCancelNotice('member-jordan');
    expect(memberRestored.status).toBe('active');

    const pendingAfter = await api.listPendingCancels('silver-spring');
    expect(pendingAfter.some((c) => c.memberId === 'member-jordan')).toBe(false);

    const membership = await api.getMembership('member-jordan');
    expect(membership.cancelEffectiveDate).toBeUndefined();

    // Notification confirms rescission
    const notifs = await api.listNotifications('member-jordan');
    expect(notifs.some((n) => n.title.includes('Cancellation Rescinded'))).toBe(true);
  });
});
