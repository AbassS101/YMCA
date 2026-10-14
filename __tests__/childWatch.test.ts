import { getStatusAt, validateSignIn } from '@/domain/childWatch';
import type { ChildProfile, ChildWatchVisit } from '@/domain/types';

// 2026-09-14 is a Monday, 09-19 Saturday, 09-20 Sunday.
const at = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00`);
const MON = '2026-09-14';
const SAT = '2026-09-19';
const SUN = '2026-09-20';

const child: ChildProfile = {
  id: 'c1',
  memberId: 'm1',
  firstName: 'Mia',
  lastName: 'Doe',
  birthDate: '2021-03-12',
};

describe('Child Watch hours', () => {
  it.each([
    [MON, '08:59', 'closed'],
    [MON, '09:00', 'open'],
    [MON, '11:29', 'open'],
    [MON, '11:30', 'signInClosed'],
    [MON, '12:00', 'closed'],
    [MON, '16:00', 'open'],
    [MON, '19:30', 'signInClosed'],
    [MON, '20:00', 'closed'],
    [SAT, '10:00', 'open'],
    [SAT, '13:00', 'closed'],
    [SAT, '16:30', 'closed'],
    [SUN, '10:00', 'closed'],
    [SUN, '17:00', 'closed'],
  ])('%s %s -> %s', (day, time, expected) => {
    expect(getStatusAt(at(day, time)).state).toBe(expected);
  });

  it('opens Monday 9 AM after Saturday afternoon', () => {
    const s = getStatusAt(at(SAT, '13:00'));
    expect(s.state).toBe('closed');
    if (s.state === 'closed') {
      expect(s.nextOpen?.getDay()).toBe(1);
      expect(s.nextOpen?.getHours()).toBe(9);
    }
  });
});

describe('Child Watch sign-in rules', () => {
  const base = { now: at(MON, '10:00'), child, visits: [] as ChildWatchVisit[], parentCheckedInAtDesk: true };

  it('allows a valid sign-in', () => {
    expect(validateSignIn(base).ok).toBe(true);
  });

  it('refuses when parent has not checked in at the desk', () => {
    expect(validateSignIn({ ...base, parentCheckedInAtDesk: false }).ok).toBe(false);
  });

  it('refuses after the cutoff and when closed', () => {
    expect(validateSignIn({ ...base, now: at(MON, '11:45') }).ok).toBe(false);
    expect(validateSignIn({ ...base, now: at(SUN, '10:00') }).ok).toBe(false);
  });

  it('refuses children under 6 weeks', () => {
    const baby = { ...child, birthDate: '2026-09-01' };
    expect(validateSignIn({ ...base, child: baby }).ok).toBe(false);
    const ok = { ...child, birthDate: '2026-07-01' };
    expect(validateSignIn({ ...base, child: ok }).ok).toBe(true);
  });

  it('refuses after 2 hours used today', () => {
    const visits: ChildWatchVisit[] = [
      {
        id: 'v1',
        childId: 'c1',
        memberId: 'm1',
        signedInAt: at(MON, '09:00').toISOString(),
        signedOutAt: at(MON, '09:30').toISOString(),
        signedInBy: 'member',
        pickupCode: '1111',
      },
      {
        id: 'v2',
        childId: 'c1',
        memberId: 'm1',
        signedInAt: at(MON, '09:40').toISOString(),
        signedOutAt: at(MON, '11:10').toISOString(),
        signedInBy: 'member',
        pickupCode: '2222',
      },
    ];
    expect(validateSignIn({ ...base, visits, now: at(MON, '11:15') }).ok).toBe(false);
  });

  it('refuses when the room is full', () => {
    const visits: ChildWatchVisit[] = Array.from({ length: 25 }, (_, i) => ({
      id: `v${i}`,
      childId: `other-${i}`,
      memberId: 'x',
      signedInAt: at(MON, '09:30').toISOString(),
      signedInBy: 'member',
      pickupCode: '0000',
    }));
    expect(validateSignIn({ ...base, visits }).ok).toBe(false);
  });
});
