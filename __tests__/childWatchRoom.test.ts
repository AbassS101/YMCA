import { deriveRoomAlerts, type RoomChild } from '@/components/staff/dashboards/useChildWatchRoom';
import type { ChildWatchAuthorizedPickup, ChildWatchIncident } from '@/domain/types';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@/context/AppConfigContext', () => ({ useAppConfig: jest.fn() }));
jest.mock('@/context/SessionContext', () => ({ useSession: jest.fn() }));
jest.mock('@/context/useStaffCapabilities', () => ({ useStaffCapabilities: jest.fn() }));
jest.mock('@/repositories/childWatchRepo', () => ({ childWatchRepo: {} }));
jest.mock('@/components/staff/dashboards/format', () => ({ BRANCH_ID: 'branch-1' }));

type Input = Parameters<typeof deriveRoomAlerts>[0];

const NOW = new Date(2026, 5, 1, 10, 0).getTime();

function child(id: string, minutesLeft: number): RoomChild {
  return {
    visit: { id: `v-${id}` },
    child: { id, name: `Kid${id} Last` },
    ageMonths: 48,
    minutesIn: 30,
    minutesLeft,
    hasAllergy: false,
  } as unknown as RoomChild;
}

function incident(id: string, over: Partial<ChildWatchIncident> = {}): ChildWatchIncident {
  return { id, childId: 'c1', householdId: 'h1', type: 'injury', severity: 'low', status: 'open', ...over } as ChildWatchIncident;
}

function input(over: Partial<Input> = {}): Input {
  return {
    inRoom: [child('1', 90)],
    capacity: 10,
    ratio: 'ok',
    headcountDueInMin: 20,
    openIncidents: [],
    awaitingAck: [],
    pendingPickups: [],
    closesInMin: 120,
    coverageGaps: [],
    ...over,
  };
}

const run = (over: Partial<Input> = {}, ctx: Parameters<typeof deriveRoomAlerts>[1] = {}) =>
  deriveRoomAlerts(input(over), { nowMs: NOW, nowMinutes: 600, ...ctx });
const keys = (alerts: ReturnType<typeof run>) => alerts.map((a) => a.key);

describe('deriveRoomAlerts', () => {
  it('returns nothing when the room is healthy', () => {
    expect(run()).toEqual([]);
  });

  it('flags an over-ratio room as critical and at-limit as a warning', () => {
    expect(run({ ratio: 'over' })[0]).toMatchObject({ key: 'ratio-over', level: 'critical' });
    expect(run({ ratio: 'at_limit' })[0]).toMatchObject({ key: 'ratio-limit', level: 'warning' });
  });

  it('flags a room over capacity', () => {
    expect(keys(run({ capacity: 1, inRoom: [child('1', 90), child('2', 90)] }))).toContain('capacity');
    expect(keys(run({ capacity: 2, inRoom: [child('1', 90), child('2', 90)] }))).not.toContain('capacity');
  });

  it('flags a headcount overdue by more than 5 minutes', () => {
    expect(keys(run({ headcountDueInMin: -6 }))).toContain('headcount-overdue');
    expect(keys(run({ headcountDueInMin: -5 }))).not.toContain('headcount-overdue');
  });

  it('flags a headcount mismatch from context', () => {
    expect(keys(run({}, { headcountMismatch: true }))).toContain('headcount-mismatch');
  });

  it('flags only open high-severity incidents as critical', () => {
    const alerts = run({ openIncidents: [incident('hi', { severity: 'high' }), incident('lo')] });
    expect(keys(alerts)).toContain('incident-high-hi');
    expect(keys(alerts)).not.toContain('incident-high-lo');
  });

  it('warns about children near or over the daily limit', () => {
    const alerts = run({ inRoom: [child('1', 15), child('2', 0), child('3', 16)] });
    expect(keys(alerts)).toEqual(expect.arrayContaining(['limit-v-1', 'limit-v-2']));
    expect(keys(alerts)).not.toContain('limit-v-3');
    expect(alerts.find((a) => a.key === 'limit-v-2')?.title).toBe('Child over daily limit');
  });

  it('warns when the room closes soon with kids still in, but not when empty', () => {
    expect(keys(run({ closesInMin: 10 }))).toContain('closing');
    expect(keys(run({ closesInMin: 16 }))).not.toContain('closing');
    expect(keys(run({ closesInMin: 10, inRoom: [] }))).not.toContain('closing');
    expect(keys(run({ closesInMin: null }))).not.toContain('closing');
  });

  it('warns about a coverage gap in the next two hours only', () => {
    expect(keys(run({ coverageGaps: [{ start: '10:30', end: '11:00' }] }))).toContain('gap');
    expect(keys(run({ coverageGaps: [{ start: '13:00', end: '14:00' }] }))).not.toContain('gap');
  });

  it('warns when a parent has not acknowledged for over 30 minutes', () => {
    const old = incident('a', { parentNotifiedAt: new Date(NOW - 31 * 60_000).toISOString() });
    const fresh = incident('b', { parentNotifiedAt: new Date(NOW - 10 * 60_000).toISOString() });
    const alerts = run({ awaitingAck: [old, fresh] });
    expect(keys(alerts)).toContain('ack-a');
    expect(keys(alerts)).not.toContain('ack-b');
  });

  it('only shows director info alerts when canManage is set', () => {
    const over = { pendingPickups: [{ id: 'p1' } as ChildWatchAuthorizedPickup], openIncidents: [incident('x')] };
    expect(keys(run(over))).toEqual([]);
    expect(keys(run(over, { canManage: true }))).toEqual(expect.arrayContaining(['pickups', 'unreviewed']));
  });

  it('sorts critical before warning before info', () => {
    const alerts = run(
      {
        ratio: 'at_limit',
        headcountDueInMin: -10,
        pendingPickups: [{ id: 'p1' } as ChildWatchAuthorizedPickup],
      },
      { canManage: true }
    );
    expect(alerts.map((a) => a.level)).toEqual(['critical', 'warning', 'info']);
  });
});
