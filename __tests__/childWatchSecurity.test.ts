import { generatePickupCode, hashPickupCode, isGuardianOf, redactVisit, validatePickup } from '@/domain/childWatchSecurity';
import { DEFAULT_CHILD_WATCH_RULES } from '@/domain/childWatch';
import { buildChildWatchReport } from '@/domain/childWatchReports';
import type { ChildWatchAuthorizedPickup, ChildWatchVisit, Member } from '@/domain/types';

const TODAY = '2026-10-14';
const rules = DEFAULT_CHILD_WATCH_RULES;

const member = (over: Partial<Member>): Member =>
  ({ id: 'm', name: 'M', email: '', phone: '', address: '', membershipId: '', homeBranchId: '', type: '', status: 'active', ...over }) as Member;

const visit = (over: Partial<ChildWatchVisit> = {}): ChildWatchVisit => {
  const id = over.id ?? 'v1';
  return {
    id,
    childId: 'c1',
    memberId: 'm1',
    signedInAt: '2026-10-14T14:00:00.000Z',
    signedInBy: 'm1',
    pickupCode: '',
    pickupCodeHash: hashPickupCode('123456', id),
    ...over,
  };
};

const person = (over: Partial<ChildWatchAuthorizedPickup> = {}): ChildWatchAuthorizedPickup => ({
  id: 'ap1',
  householdId: 'h1',
  name: 'Aunt May',
  relationship: 'Aunt',
  phone: '555',
  status: 'approved',
  addedByMemberId: 'm1',
  addedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

const staff = { kind: 'staff', canRunRoom: true } as const;
const base = { idVerified: false, rules };

describe('pickup codes', () => {
  it('generates digit codes of the requested length from the rng', () => {
    expect(generatePickupCode(6)).toMatch(/^\d{6}$/);
    expect(generatePickupCode(4, () => 0.5)).toBe('5555');
    expect(generatePickupCode(3, () => 0.9999999)).toBe('999');
  });

  it('hashes per visit and never returns the plain code', () => {
    const h = hashPickupCode('123456', 'v1');
    expect(h).not.toContain('123456');
    expect(h).toBe(hashPickupCode('123456', 'v1'));
    expect(h).not.toBe(hashPickupCode('123456', 'v2'));
    expect(h).not.toBe(hashPickupCode('654321', 'v1'));
  });
});

describe('isGuardianOf', () => {
  const parent = member({ id: 'p', householdId: 'h1', birthDate: '1985-01-01' });
  const kid = member({ id: 'k', householdId: 'h1', birthDate: '2020-01-01' });
  it('allows adults in the same household only', () => {
    expect(isGuardianOf(parent, kid, TODAY)).toBe(true);
    expect(isGuardianOf(member({ id: 'o', householdId: 'h2', birthDate: '1985-01-01' }), kid, TODAY)).toBe(false);
    expect(isGuardianOf(member({ id: 't', householdId: 'h1', birthDate: '2010-01-01' }), kid, TODAY)).toBe(false);
    expect(isGuardianOf(member({ id: 'n', householdId: 'h1' }), kid, TODAY)).toBe(false);
  });
  it('treats a standalone member as their own household', () => {
    const solo = member({ id: 's', birthDate: '1985-01-01' });
    expect(isGuardianOf(solo, member({ id: 's', birthDate: '1985-01-01' }), TODAY)).toBe(true);
    expect(isGuardianOf(solo, kid, TODAY)).toBe(false);
  });
  it('is 18+ on the birthday', () => {
    const turning = member({ id: 'x', householdId: 'h1', birthDate: '2008-10-14' });
    expect(isGuardianOf(turning, kid, TODAY)).toBe(true);
    expect(isGuardianOf(turning, kid, '2026-10-13')).toBe(false);
  });
});

describe('validatePickup', () => {
  it('lets a household guardian self sign out when allowed', () => {
    const r = validatePickup({ ...base, visit: visit(), requester: { kind: 'member', isGuardian: true } });
    expect(r).toEqual({ ok: true, verification: 'household_self' });
  });
  it('refuses self sign out when the toggle is off', () => {
    const r = validatePickup({
      ...base,
      rules: { ...rules, allowMemberSelfSignOut: false },
      visit: visit(),
      requester: { kind: 'member', isGuardian: true },
    });
    expect(r.ok).toBe(false);
  });
  it('refuses a member who is not a guardian', () => {
    const r = validatePickup({ ...base, visit: visit(), requester: { kind: 'member', isGuardian: false } });
    expect(r.ok).toBe(false);
  });
  it('requires the right code from staff', () => {
    expect(validatePickup({ ...base, visit: visit(), code: '123456', requester: staff })).toEqual({ ok: true, verification: 'code' });
    const wrong = validatePickup({ ...base, visit: visit(), code: '000000', requester: staff });
    expect(wrong.ok).toBe(false);
    expect(validatePickup({ ...base, visit: visit(), requester: staff }).ok).toBe(false);
  });
  it('accepts a legacy plain code', () => {
    const legacy = visit({ pickupCode: '4321', pickupCodeHash: undefined });
    expect(validatePickup({ ...base, visit: legacy, code: '4321', requester: staff }).ok).toBe(true);
    expect(validatePickup({ ...base, visit: legacy, code: '0000', requester: staff }).ok).toBe(false);
  });
  it('flags a lock on the attempt that reaches the limit', () => {
    const v = visit({ failedCodeAttempts: rules.maxCodeAttempts - 1 });
    const r = validatePickup({ ...base, visit: v, code: '000000', requester: staff });
    expect(r).toMatchObject({ ok: false, lock: true });
    const early = validatePickup({ ...base, visit: visit({ failedCodeAttempts: 0 }), code: '000000', requester: staff });
    expect(early).toMatchObject({ ok: false });
    expect((early as { lock?: boolean }).lock).toBeUndefined();
  });
  it('needs an approved person and ID for non-household pickup', () => {
    const args = { ...base, visit: visit(), code: '123456', requester: staff };
    expect(validatePickup({ ...args, guardian: person(), idVerified: true })).toEqual({ ok: true, verification: 'code_and_id' });
    expect(validatePickup({ ...args, guardian: person() }).ok).toBe(false);
    expect(validatePickup({ ...args, guardian: person({ status: 'pending' }), idVerified: true }).ok).toBe(false);
    expect(validatePickup({ ...args, guardian: person({ status: 'revoked' }), idVerified: true }).ok).toBe(false);
    expect(validatePickup({ ...args, guardian: person({ expiresOn: '2026-01-01' }), idVerified: true, today: TODAY }).ok).toBe(false);
  });
  it('skips the ID check when the rule is off', () => {
    const r = validatePickup({
      ...base,
      rules: { ...rules, requireIdForNonHouseholdPickup: false },
      visit: visit(),
      code: '123456',
      guardian: person(),
      requester: staff,
    });
    expect(r).toEqual({ ok: true, verification: 'code_and_id' });
  });
  it('releases a locked visit only for room staff with a reason and ID', () => {
    const locked = visit({ locked: true });
    expect(validatePickup({ ...base, visit: locked, code: '123456', requester: staff }).ok).toBe(false);
    expect(validatePickup({ ...base, visit: locked, requester: staff, overrideReason: 'Lost phone' }).ok).toBe(false);
    expect(validatePickup({ ...base, visit: locked, requester: staff, idVerified: true }).ok).toBe(false);
    expect(
      validatePickup({ ...base, visit: locked, requester: { kind: 'staff', canRunRoom: false }, overrideReason: 'x', idVerified: true }).ok
    ).toBe(false);
    expect(validatePickup({ ...base, visit: locked, requester: { kind: 'member', isGuardian: true } }).ok).toBe(false);
    expect(validatePickup({ ...base, visit: locked, requester: staff, overrideReason: 'Lost phone', idVerified: true })).toEqual({
      ok: true,
      verification: 'supervisor_override',
    });
  });
  it('denies staff without room access and already picked-up visits', () => {
    expect(validatePickup({ ...base, visit: visit(), code: '123456', requester: { kind: 'staff', canRunRoom: false } }).ok).toBe(false);
    expect(validatePickup({ ...base, visit: visit({ signedOutAt: '2026-10-14T15:00:00.000Z' }), code: '123456', requester: staff }).ok).toBe(false);
  });
});

describe('redactVisit', () => {
  it('strips the code and hash for non-guardians', () => {
    const v = visit({ pickupCode: '999999' });
    const out = redactVisit(v, false);
    expect(out.pickupCode).toBe('');
    expect(out.pickupCodeHash).toBeUndefined();
    expect(out.id).toBe(v.id);
  });
  it('keeps the visit for guardians', () => {
    const v = visit({ pickupCode: '999999' });
    expect(redactVisit(v, true)).toBe(v);
  });
});

describe('buildChildWatchReport', () => {
  const at = (t: string) => `2026-10-14T${t}:00`;
  const v = (id: string, inT: string, outT?: string): ChildWatchVisit =>
    visit({ id, signedInAt: new Date(at(inT)).toISOString(), signedOutAt: outT ? new Date(at(outT)).toISOString() : undefined });

  it('summarises visits, occupancy, stays, incidents and headcounts', () => {
    const visits = [v('a', '09:00', '10:00'), v('b', '09:30', '12:00'), v('c', '11:00', '11:30'), v('old', '09:00', '10:00')];
    visits[3] = { ...visits[3], signedInAt: new Date('2026-10-01T09:00:00').toISOString(), signedOutAt: new Date('2026-10-01T10:00:00').toISOString() };
    const incidents = [
      { id: 'i1', type: 'injury', at: new Date(at('10:00')).toISOString() },
      { id: 'i2', type: 'injury', at: new Date(at('10:30')).toISOString() },
      { id: 'i3', type: 'illness', at: new Date('2026-09-01T10:00:00').toISOString() },
    ] as never;
    const headcounts = [
      { id: 'h1', at: new Date(at('10:00')).toISOString(), counted: 3, expected: 3 },
      { id: 'h2', at: new Date(at('11:00')).toISOString(), counted: 2, expected: 3 },
    ] as never;
    const r = buildChildWatchReport(visits, incidents, headcounts, { from: '2026-10-14', to: '2026-10-14' });
    expect(r.visitsPerDay).toEqual([{ date: '2026-10-14', visits: 3 }]);
    expect(r.peakOccupancy).toBe(2);
    expect(r.avgStayMin).toBe(80); // (60 + 150 + 30) / 3
    expect(r.overLimitStays).toBe(1);
    expect(r.incidentsByType).toEqual({ injury: 2 });
    expect(r.headcountMismatches).toBe(1);
  });

  it('handles an empty range', () => {
    expect(buildChildWatchReport([], [], [], { from: '2026-10-01', to: '2026-10-02' })).toEqual({
      visitsPerDay: [],
      peakOccupancy: 0,
      avgStayMin: 0,
      overLimitStays: 0,
      incidentsByType: {},
      headcountMismatches: 0,
    });
  });
});
