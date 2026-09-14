jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { DEMO_TODAY } from '@/domain/demoClock';
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

test('login returns jordan as member', async () => {
  const api = new MockProtivityAdapter();
  await expect(api.login('jordan@silverspring.ymca', 'ymca-demo')).resolves.toEqual({
    userId: 'member-jordan',
    role: 'member',
  });
});

test('getStaffDay matches demo today from ISO date prefix', async () => {
  const api = new MockProtivityAdapter();
  const day = await api.getStaffDay('staff-alex', DEMO_TODAY);
  expect(day.map((i) => i.id)).toContain('sched-bodypump-mon');
});

test('bad login throws', async () => {
  const api = new MockProtivityAdapter();
  await expect(api.login('jordan@silverspring.ymca', 'wrong')).rejects.toThrow();
});

test('cancel after deadline sets pending and blocks second submit', async () => {
  const api = new MockProtivityAdapter();
  const req = await api.submitCancelNotice('member-jordan', {
    reason: 'Moving',
    requestedAt: '2026-09-14',
  });
  expect(req.lastBillDate).toBe('2026-10-12');
  expect(req.accessThrough).toBe('2026-11-11');
  const member = await api.getMember('member-jordan');
  expect(member.status).toBe('cancel_pending');
  await expect(
    api.submitCancelNotice('member-jordan', { reason: 'again', requestedAt: '2026-09-14' })
  ).rejects.toThrow(/already/i);
});

test('MockProtivityAdapter exposes all ProtivityPort methods', () => {
  const api = new MockProtivityAdapter();
  const methods = [
    'login',
    'getMember',
    'getStaff',
    'getMembership',
    'getSchedules',
    'getStaffDay',
    'listAssignedMembers',
    'getAssignedTrainer',
    'updatePaymentMethod',
    'submitCancelNotice',
    'listPendingCancels',
    'listMessages',
    'listThreads',
    'sendMessage',
  ];
  for (const m of methods) {
    expect(typeof (api as any)[m]).toBe('function');
  }
});
