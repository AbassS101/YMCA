import type { ChildWatchRules } from '@/domain/childWatch';
import { ADULT_MIN_AGE, ageOn } from '@/domain/householdAccess';
import type { ChildWatchAuthorizedPickup, ChildWatchVerification, ChildWatchVisit, Member } from '@/domain/types';

/** Random numeric code of the given length. `rng` returns [0,1) and can be injected for tests. */
export function generatePickupCode(length: number, rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < length; i++) out += String(Math.min(9, Math.floor(rng() * 10)));
  return out;
}

/** Salted 32-bit FNV-1a hash (hex). Not cryptographic - fine for the mock; the live system hashes server-side. */
export function hashPickupCode(code: string, visitId: string): string {
  const input = `${visitId}:${code}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `h1_${h.toString(16).padStart(8, '0')}`;
}

function householdKey(m: Member): string {
  return m.householdId ?? m.id;
}

/**
 * True when `member` is an adult (18+) in the same household as `childMember`
 * (the member record the child belongs to: the parent/primary, or the child's own record).
 */
export function isGuardianOf(member: Member, childMember: Member, today: string | Date): boolean {
  if (!member.birthDate) return false;
  if (ageOn(member.birthDate, today) < ADULT_MIN_AGE) return false;
  return householdKey(member) === householdKey(childMember);
}

export type PickupRequester = { kind: 'member'; isGuardian: boolean } | { kind: 'staff'; canRunRoom: boolean };

export type PickupDecision =
  | { ok: true; verification: ChildWatchVerification }
  /** `lock` is true when this failed attempt reached the attempt limit and the visit should be locked. */
  | { ok: false; reason: string; lock?: boolean; codeFailed?: boolean };

function codeMatches(visit: ChildWatchVisit, code: string): boolean {
  if (visit.pickupCodeHash) return visit.pickupCodeHash === hashPickupCode(code, visit.id);
  return visit.pickupCode !== '' && visit.pickupCode === code;
}

/**
 * Decides whether a pickup may proceed. Pure: the caller records failed attempts and locks.
 * `guardian` is the approved non-household pickup person, when one is being used.
 */
export function validatePickup(input: {
  visit: ChildWatchVisit;
  code?: string;
  guardian?: ChildWatchAuthorizedPickup;
  idVerified: boolean;
  requester: PickupRequester;
  rules: Pick<ChildWatchRules, 'maxCodeAttempts' | 'allowMemberSelfSignOut' | 'requireIdForNonHouseholdPickup'>;
  overrideReason?: string;
  /** YYYY-MM-DD, used to check the pickup person's expiry. */
  today?: string;
}): PickupDecision {
  const { visit, code, guardian, idVerified, requester, rules } = input;
  if (visit.signedOutAt) return { ok: false, reason: 'This child has already been picked up.' };

  if (visit.locked) {
    if (requester.kind === 'staff' && requester.canRunRoom && input.overrideReason?.trim() && idVerified) {
      return { ok: true, verification: 'supervisor_override' };
    }
    return { ok: false, reason: 'This visit is locked. A Child Watch supervisor must verify ID and release the child.' };
  }

  if (requester.kind === 'member') {
    if (!requester.isGuardian) return { ok: false, reason: 'Only a guardian in this household can pick up this child.' };
    if (!rules.allowMemberSelfSignOut) return { ok: false, reason: 'Pickup must be completed by Child Watch staff.' };
    return { ok: true, verification: 'household_self' };
  }

  if (!requester.canRunRoom) return { ok: false, reason: 'You do not have access to Child Watch pickups.' };

  if (!code || !codeMatches(visit, code)) {
    const attempts = (visit.failedCodeAttempts ?? 0) + 1;
    if (attempts >= rules.maxCodeAttempts) {
      return { ok: false, reason: 'Too many incorrect codes. This visit is now locked.', lock: true, codeFailed: true };
    }
    return { ok: false, reason: `Incorrect pickup code. ${rules.maxCodeAttempts - attempts} attempt(s) left.`, codeFailed: true };
  }

  if (guardian) {
    if (guardian.status !== 'approved') return { ok: false, reason: `${guardian.name} is not an approved pickup person.` };
    if (guardian.expiresOn && input.today && guardian.expiresOn < input.today) {
      return { ok: false, reason: `${guardian.name}'s pickup authorization has expired.` };
    }
    if (rules.requireIdForNonHouseholdPickup && !idVerified) {
      return { ok: false, reason: "Check the pickup person's photo ID before releasing the child." };
    }
    return { ok: true, verification: 'code_and_id' };
  }
  return { ok: true, verification: 'code' };
}

/** Removes the pickup code fields unless the viewer is a guardian of the child. */
export function redactVisit(visit: ChildWatchVisit, viewerIsGuardian: boolean): ChildWatchVisit {
  if (viewerIsGuardian) return visit;
  const { pickupCodeHash: _hash, ...rest } = visit;
  return { ...rest, pickupCode: '' };
}
