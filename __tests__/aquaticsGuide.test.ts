import {
  AQUATICS_CLASSES,
  AQUATICS_SESSION_INFO,
  CERTIFICATION_PROGRAMS,
  getClassesByDay,
  getClassesByStage,
  searchAquaticsClasses,
  SWIM_STAGES,
} from '../src/domain/aquaticsGuideData';

describe('YMCA Silver Spring Aquatics Guide Domain & Flyer Accuracy', () => {
  it('defines the official Fall 1 Session dates and registration timelines', () => {
    expect(AQUATICS_SESSION_INFO.startDate).toBe('September 08, 2026');
    expect(AQUATICS_SESSION_INFO.endDate).toBe('November 01, 2026');
    expect(AQUATICS_SESSION_INFO.laborDayNotice).toContain('September 07, 2026 – Labor Day');
    expect(AQUATICS_SESSION_INFO.registrationDates.fullMembers).toBe('August 24, 2026');
    expect(AQUATICS_SESSION_INFO.registrationDates.programMembers).toBe('September 01, 2026');
  });

  it('contains the complete leadership team and direct contact info', () => {
    const names = AQUATICS_SESSION_INFO.contacts.map((c) => c.name);
    expect(names).toContain('Aleksandar Milojkovic');
    expect(names).toContain('Vance Brown');
    expect(names).toContain('Michelle Barry');

    const aleks = AQUATICS_SESSION_INFO.contacts.find((c) => c.name === 'Aleksandar Milojkovic');
    expect(aleks?.role).toBe('Aquatics Director');
    expect(aleks?.email).toBe('Aleksandar.Milojkovic@ymcadc.org');
  });

  it('accurately lists the hours of operation for indoor and outdoor pools', () => {
    expect(AQUATICS_SESSION_INFO.hours).toHaveLength(3);
    const weekday = AQUATICS_SESSION_INFO.hours[0];
    expect(weekday.indoorHours).toBe('6:00 AM – 9:45 PM');
    expect(weekday.outdoorHours).toBe('6:00 AM – 9:00 PM');
  });

  it('defines all 8 official YMCA swim stages across 3 tracks', () => {
    expect(SWIM_STAGES).toHaveLength(8);
    const codes = SWIM_STAGES.map((s) => s.code);
    expect(codes).toEqual(['A', 'B', '1', '2', '3', '4', '5', '6']);

    const stageA = SWIM_STAGES.find((s) => s.code === 'A');
    expect(stageA?.track).toBe('starters');
    expect(stageA?.name).toBe('Water Discovery');

    const stage1 = SWIM_STAGES.find((s) => s.code === '1');
    expect(stage1?.track).toBe('basics');
    expect(stage1?.name).toBe('Water Acclimation');

    const stage6 = SWIM_STAGES.find((s) => s.code === '6');
    expect(stage6?.track).toBe('strokes');
    expect(stage6?.name).toBe('Stroke Mechanics');
  });

  it('contains all 28 classes scheduled in the flyer', () => {
    expect(AQUATICS_CLASSES).toHaveLength(28);

    const mon = getClassesByDay('Monday');
    const fri = getClassesByDay('Friday');
    const sat = getClassesByDay('Saturday');
    const sun = getClassesByDay('Sunday');

    expect(mon).toHaveLength(1);
    expect(fri).toHaveLength(1);
    expect(sat).toHaveLength(14);
    expect(sun).toHaveLength(12);
  });

  it('verifies exact pricing and class codes from the official flyer', () => {
    // Monday Masters
    const masters = AQUATICS_CLASSES.find((c) => c.id === 'class-mon-masters');
    expect(masters).toBeDefined();
    expect(masters?.classCode).toBe('02301-05');
    expect(masters?.fullMemberPrice).toBe(170);
    expect(masters?.programMemberPrice).toBe(245);
    expect(masters?.totalClasses).toBe(15);

    // Friday Free Sharon Kelly Beginner
    const friBeginner = AQUATICS_CLASSES.find((c) => c.id === 'class-fri-teen-adult-beginner');
    expect(friBeginner).toBeDefined();
    expect(friBeginner?.classCode).toBe('02301-17');
    expect(friBeginner?.isFree).toBe(true);
    expect(friBeginner?.fullMemberPrice).toBe(0);
    expect(friBeginner?.programMemberPrice).toBe(0);

    // Saturday 8:00 AM Parent & Child A
    const satParentA = AQUATICS_CLASSES.find((c) => c.classCode === '02101-20');
    expect(satParentA).toBeDefined();
    expect(satParentA?.fullMemberPrice).toBe(112);
    expect(satParentA?.programMemberPrice).toBe(185);

    // Saturday 10:00 AM Youth Stage 6 Stroke Mechanic
    const satStage6 = AQUATICS_CLASSES.find((c) => c.classCode === '02101-23');
    expect(satStage6).toBeDefined();
    expect(satStage6?.fullMemberPrice).toBe(112);

    // Sunday 12:40 PM Youth Stage 6
    const sunStage6 = AQUATICS_CLASSES.find((c) => c.classCode === '02101-66');
    expect(sunStage6).toBeDefined();
    expect(sunStage6?.startTime).toBe('12:40 PM');
  });

  it('includes CPR, Lifeguarding, and Masters certifications', () => {
    expect(CERTIFICATION_PROGRAMS).toHaveLength(3);
    const titles = CERTIFICATION_PROGRAMS.map((c) => c.title);
    expect(titles).toContain('CPR for the Community');
    expect(titles).toContain('American Red Cross Lifeguard Certification');
    expect(titles).toContain('YMCA Masters Swim Program');
  });

  it('supports searching classes by title, code, age, or stage', () => {
    const byCode = searchAquaticsClasses('02101-20');
    expect(byCode).toHaveLength(1);
    expect(byCode[0].title).toContain('Parent and Child Stage A');

    const byAge = searchAquaticsClasses('Parent/Child');
    expect(byAge.length).toBeGreaterThanOrEqual(3);

    const byStage = getClassesByStage('6');
    expect(byStage.length).toBeGreaterThanOrEqual(2);
  });
});
