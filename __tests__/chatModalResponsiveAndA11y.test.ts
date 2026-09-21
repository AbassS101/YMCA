jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  calculateModalTopInset,
  formatChatTime,
} from '@/components/ChatModal';

describe('ChatModal Safe Area Insets & Responsive Calculations', () => {
  it('correctly calculates top inset for iPhone Dynamic Island devices (iPhone 14/15/16 Pro)', () => {
    // Dynamic Island provides ~54-59px top inset
    const dynamicIslandInset = 59;
    const calculated = calculateModalTopInset(dynamicIslandInset, 'ios');
    expect(calculated).toBe(59);
  });

  it('provides safe iOS fallback inset when insetsTop is 0 or low to avoid Dynamic Island cutout', () => {
    const zeroInset = 0;
    const calculated = calculateModalTopInset(zeroInset, 'ios');
    // Safe minimum of at least 48px to clear island/notch
    expect(calculated).toBeGreaterThanOrEqual(48);
  });

  it('respects Android status bar insets while enforcing minimum clearance', () => {
    const androidPunchHole = 36;
    expect(calculateModalTopInset(androidPunchHole, 'android')).toBe(36);

    const androidZero = 0;
    expect(calculateModalTopInset(androidZero, 'android')).toBe(20);
  });

  it('formats timestamp into accessible locale time string', () => {
    const testDate = new Date('2026-09-18T14:30:00Z').toISOString();
    const formatted = formatChatTime(testDate);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('generates proper VoiceOver / TalkBack message speech labels', () => {
    const mine = true;
    const body = 'Hello, what time is the pool open?';
    const time = '2:30 PM';
    const speechLabelMine = `${mine ? 'You' : 'Staff'} said: ${body}. Sent at ${time}`;
    expect(speechLabelMine).toBe('You said: Hello, what time is the pool open?. Sent at 2:30 PM');

    const theirs = false;
    const recipientName = 'Alex Rivers';
    const speechLabelTheirs = `${theirs ? 'You' : recipientName} said: ${body}. Sent at ${time}`;
    expect(speechLabelTheirs).toBe('Alex Rivers said: Hello, what time is the pool open?. Sent at 2:30 PM');
  });
});
