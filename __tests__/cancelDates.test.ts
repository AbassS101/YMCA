import { computeCancelDates } from '@/domain/cancelDates';

test('after deadline: Sep 14 with next bill Oct 12 → last bill Oct 12, access through Nov 11', () => {
  const result = computeCancelDates({
    nextBillingDate: '2026-10-12',
    requestedAt: '2026-09-14',
  });
  expect(result.noticeDeadline).toBe('2026-09-12');
  expect(result.lastBillDate).toBe('2026-10-12');
  expect(result.accessThrough).toBe('2026-11-11');
});

test('on or before deadline: skips upcoming draft', () => {
  const result = computeCancelDates({
    nextBillingDate: '2026-10-12',
    requestedAt: '2026-09-12',
    previousBillingDate: '2026-09-12',
  });
  expect(result.lastBillDate).toBe('2026-09-12');
  expect(result.accessThrough).toBe('2026-10-11');
});

test('before deadline with no previous bill', () => {
  const result = computeCancelDates({
    nextBillingDate: '2026-10-12',
    requestedAt: '2026-09-01',
  });
  expect(result.lastBillDate).toBe('');
  expect(result.accessThrough).toBe('2026-10-11');
});
