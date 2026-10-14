import {
  accessSummary,
  ageBand,
  ageOn,
  canHoldSoloMembership,
  facilityAccess,
  validateHousehold,
} from '@/domain/householdAccess';

const TODAY = '2026-10-13';

describe('age bands', () => {
  it('ageOn respects birthdays', () => {
    expect(ageOn('2013-10-13', TODAY)).toBe(13);
    expect(ageOn('2013-10-14', TODAY)).toBe(12);
  });
  it.each([
    ['2014-01-01', 'child'], // 12
    ['2013-10-13', 'teen'], // 13
    ['2009-01-01', 'teen'], // 17
    ['2008-10-13', 'adult'], // 18
  ])('%s -> %s', (dob, band) => {
    expect(ageBand(dob, TODAY)).toBe(band);
  });
});

describe('facilityAccess', () => {
  const base = { type: 'Family II', status: 'active' as const };
  it('under 13: pool, lessons, child watch but no gym', () => {
    const a = facilityAccess({ ...base, birthDate: '2018-01-01' }, TODAY);
    expect(a.gym.status).toBe('not_allowed');
    expect(a.pool.status).toBe('allowed');
    expect(a.swimLessons.status).toBe('allowed');
    expect(a.childWatch.status).toBe('allowed');
  });
  it('teen needs orientation, then gets gym', () => {
    const before = facilityAccess({ ...base, birthDate: '2011-05-05' }, TODAY);
    expect(before.gym.status).toBe('needs_orientation');
    expect(before.pool.status).toBe('allowed');
    const after = facilityAccess(
      {
        ...base,
        birthDate: '2011-05-05',
        gymOrientation: { completedAt: '2026-10-01T10:00:00Z', staffId: 's', staffName: 'T' },
      },
      TODAY
    );
    expect(after.gym.status).toBe('allowed');
    expect(accessSummary({ ...base, birthDate: '2011-05-05' }, TODAY)).toMatch(/locked/);
  });
  it('adults get everything; pickleball-only only pickleball', () => {
    expect(facilityAccess({ ...base, birthDate: '1985-01-01' }, TODAY).gym.status).toBe('allowed');
    const p = facilityAccess({ type: 'Pickleball Only Adult', status: 'active', birthDate: '1985-01-01' }, TODAY);
    expect(p.pickleball.status).toBe('allowed');
    expect(p.gym.status).toBe('not_allowed');
  });
  it('inactive members get nothing', () => {
    expect(facilityAccess({ ...base, status: 'cancelled', birthDate: '1985-01-01' }, TODAY).pool.status).toBe('not_allowed');
  });
});

describe('validateHousehold', () => {
  const adult = { birthDate: '1985-01-01' };
  const adult2 = { birthDate: '1987-01-01' };
  const teen = { birthDate: '2011-05-05' };
  const kid = { birthDate: '2018-01-01' };
  it('Family I: 1 adult + kids ok, second adult asks for upgrade', () => {
    expect(validateHousehold('family-1', [adult, teen, kid], TODAY).ok).toBe(true);
    const r = validateHousehold('family-1', [adult, adult2], TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Family II/);
  });
  it('Family II: 2 adults + kids ok, 3 adults not', () => {
    expect(validateHousehold('family-2', [adult, adult2, teen, kid], TODAY).ok).toBe(true);
    expect(validateHousehold('family-2', [adult, adult2, { birthDate: '1960-01-01' }], TODAY).ok).toBe(false);
  });
  it('individual plans cover one person; senior family needs 65+', () => {
    expect(validateHousehold('adult', [adult, kid], TODAY).ok).toBe(false);
    expect(validateHousehold('senior-family', [{ birthDate: '1955-01-01' }, { birthDate: '1957-01-01' }], TODAY).ok).toBe(true);
    expect(validateHousehold('senior-family', [{ birthDate: '1955-01-01' }, adult], TODAY).ok).toBe(false);
  });
  it('needs an adult', () => {
    expect(validateHousehold('family-2', [teen, kid], TODAY).ok).toBe(false);
  });
});

describe('canHoldSoloMembership', () => {
  it('blocks under 13', () => {
    const r = canHoldSoloMembership('2018-01-01', 'youth', TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/under 13/);
  });
  it('teens only on youth plans', () => {
    expect(canHoldSoloMembership('2011-05-05', 'youth', TODAY).ok).toBe(true);
    expect(canHoldSoloMembership('2011-05-05', 'adult', TODAY).ok).toBe(false);
    expect(canHoldSoloMembership('2011-05-05', 'family-1', TODAY).ok).toBe(false);
  });
  it('adults match age plans', () => {
    expect(canHoldSoloMembership('1985-01-01', 'adult', TODAY).ok).toBe(true);
    expect(canHoldSoloMembership('1985-01-01', 'family-2', TODAY).ok).toBe(true);
    expect(canHoldSoloMembership('1985-01-01', 'youth', TODAY).ok).toBe(false);
  });
});
