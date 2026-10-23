import { staffRouteForSharedPage } from '@/domain/staffNavigation';

it.each(['trainer', 'staff_admin', 'aquatics_director', 'desk', 'child_watch_director', 'maintenance'])(
  'keeps %s on the staff schedule when reloading a shared public URL', (role) => {
    expect(staffRouteForSharedPage('/schedules', role)).toBe('/(staff)/schedules');
  },
);

it.each(['member', 'guest', null, undefined])('preserves member routes for %s', (role) => {
  expect(staffRouteForSharedPage('/schedules', role)).toBeNull();
});

it('routes staff message deep links to the same staff conversation', () => {
  expect(staffRouteForSharedPage('/messages/thread-42', 'trainer')).toBe('/(staff)/messages/thread-42');
});

it('preserves shared resources that staff intentionally open on the member side', () => {
  expect(staffRouteForSharedPage('/community-forum', 'trainer')).toBeNull();
  expect(staffRouteForSharedPage('/aquatics-guide', 'swim_instructor')).toBeNull();
  expect(staffRouteForSharedPage('/home', 'staff_admin')).toBeNull();
});
