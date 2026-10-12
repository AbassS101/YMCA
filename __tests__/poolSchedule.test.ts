import {
  DAYS_OF_WEEK,
  findOpenLapSwimSlots,
  getCurrentSlotForPool,
  getPoolSlots,
  INDOOR_POOL_SLOTS,
  OUTDOOR_POOL_SLOTS,
  POOL_FACILITIES,
} from '../src/domain/poolScheduleData';

describe('Pool Schedule Domain & Data Integrity', () => {
  it('defines facility information for indoor and outdoor pools', () => {
    expect(POOL_FACILITIES.indoor.totalLanes).toBe(6);
    expect(POOL_FACILITIES.outdoor.totalLanes).toBe(6);
    expect(POOL_FACILITIES.indoor.temperature).toContain('83°F');
    expect(POOL_FACILITIES.outdoor.temperature).toContain('82°F');
  });

  it('covers all 7 days for both indoor and outdoor pools', () => {
    for (const { key } of DAYS_OF_WEEK) {
      const indoorSlots = getPoolSlots('indoor', key);
      const outdoorSlots = getPoolSlots('outdoor', key);

      expect(indoorSlots.length).toBeGreaterThan(0);
      expect(outdoorSlots.length).toBeGreaterThan(0);
    }
  });

  it('verifies that each slot has valid chronological start and end times', () => {
    const allSlots = [...INDOOR_POOL_SLOTS, ...OUTDOOR_POOL_SLOTS];
    for (const slot of allSlots) {
      expect(slot.endMinutes).toBeGreaterThan(slot.startMinutes);
      expect(slot.laneAllocations).toHaveLength(6);

      if (slot.isClosed) {
        expect(slot.totalLanes).toBe(0);
        expect(slot.lapLanes).toBe(0);
      } else {
        expect(slot.totalLanes).toBe(6);
        expect(slot.lapLanes + slot.recLanes + slot.programLanes).toBe(6);
      }
    }
  });

  it('accurately represents the indoor pool schedule from the flyer', () => {
    // Monday Swim Team: 4 Swim team, 1 Lap, 1 REC
    const monIndoor = getPoolSlots('indoor', 'monday');
    const swimTeamMon = monIndoor.find((s) => s.startTime === '4:00 PM');
    expect(swimTeamMon).toBeDefined();
    expect(swimTeamMon?.laneBreakdownLabel).toContain('4 Swim Team · 1 Lap · 1 REC');
    expect(swimTeamMon?.lapLanes).toBe(1);
    expect(swimTeamMon?.recLanes).toBe(1);
    expect(swimTeamMon?.programLanes).toBe(4);

    // Tuesday Preschool: 3 Lap, 3 Preschool lessons
    const tueIndoor = getPoolSlots('indoor', 'tuesday');
    const preschoolTue = tueIndoor.find((s) => s.startTime === '11:00 AM');
    expect(preschoolTue).toBeDefined();
    expect(preschoolTue?.laneBreakdownLabel).toContain('3 Lap · 3 Preschool Lessons');
    expect(preschoolTue?.lapLanes).toBe(3);
    expect(preschoolTue?.programLanes).toBe(3);

    // Wednesday 12:30 PM: 2 Lap, 3 Water Fitness, 1 Rec
    const wedIndoor = getPoolSlots('indoor', 'wednesday');
    const wedAqua = wedIndoor.find((s) => s.startTime === '12:30 PM');
    expect(wedAqua).toBeDefined();
    expect(wedAqua?.laneBreakdownLabel).toContain('2 Lap · 3 Water Fitness · 1 Rec');
    expect(wedAqua?.lapLanes).toBe(2);
    expect(wedAqua?.programLanes).toBe(3);
    expect(wedAqua?.recLanes).toBe(1);

    // Friday 6:30 PM: 2 Lap, 1 Rec, 3 Swim Lessons
    const friIndoor = getPoolSlots('indoor', 'friday');
    const friLessons = friIndoor.find((s) => s.startTime === '6:30 PM');
    expect(friLessons).toBeDefined();
    expect(friLessons?.laneBreakdownLabel).toContain('2 Lap · 1 Rec · 3 Swim Lessons');
  });

  it('accurately represents the outdoor pool schedule from the flyer', () => {
    // Monday & Friday Water Polo: 4 Laps Waterpolo, 2 Lap swim until 9 PM
    const monOutdoor = getPoolSlots('outdoor', 'monday');
    const waterPoloMon = monOutdoor.find((s) => s.startTime === '8:00 PM');
    expect(waterPoloMon).toBeDefined();
    expect(waterPoloMon?.category).toBe('waterpolo');
    expect(waterPoloMon?.programLanes).toBe(4);
    expect(waterPoloMon?.lapLanes).toBe(2);

    const friOutdoor = getPoolSlots('outdoor', 'friday');
    const waterPoloFri = friOutdoor.find((s) => s.startTime === '8:00 PM');
    expect(waterPoloFri).toBeDefined();
    expect(waterPoloFri?.category).toBe('waterpolo');
    expect(waterPoloFri?.programLanes).toBe(4);
    expect(waterPoloFri?.lapLanes).toBe(2);

    // Weekend opening hours: Closed until 7am Sat, until 8am Sun
    const satOutdoor = getPoolSlots('outdoor', 'saturday');
    expect(satOutdoor[0].isClosed).toBe(true);
    expect(satOutdoor[0].startTime).toBe('6:00 AM');
    expect(satOutdoor[0].endTime).toBe('7:00 AM');
    expect(satOutdoor[1].startTime).toBe('7:00 AM');
    expect(satOutdoor[1].lapLanes).toBe(5);
  });

  it('correctly queries current slot based on time of day', () => {
    // At 7:30 AM on Monday (450 minutes from midnight)
    const slotAt730 = getCurrentSlotForPool('indoor', 'monday', 450);
    expect(slotAt730).toBeDefined();
    expect(slotAt730?.lapLanes).toBe(5);

    // At 10:15 PM on Monday (1335 minutes from midnight)
    const slotAtNight = getCurrentSlotForPool('indoor', 'monday', 1335);
    expect(slotAtNight?.isClosed).toBe(true);
  });

  it('filters open lap swim slots by minimum lane requirement', () => {
    const bigLapSlots = findOpenLapSwimSlots('indoor', 5);
    expect(bigLapSlots.length).toBeGreaterThan(0);
    for (const slot of bigLapSlots) {
      expect(slot.lapLanes).toBeGreaterThanOrEqual(5);
    }
  });
});
