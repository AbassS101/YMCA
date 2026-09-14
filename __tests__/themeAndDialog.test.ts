jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { lightColors, darkColors, colors } from '@/theme/colors';
import { dialog } from '@/context/DialogContext';

describe('Theme System', () => {
  test('light theme provides YMCA official brand blues and high contrast', () => {
    expect(lightColors.primary).toBe('#00609C');
    expect(lightColors.primaryDark).toBe('#002855');
    expect(lightColors.nearBlack).toBe('#0F172A');
    expect(lightColors.background).toBe('#F8FAFC');
    expect(lightColors.card).toBe('#FFFFFF');
    expect(lightColors.border).toBe('#E2E8F0');
  });

  test('dark theme provides high contrast surfaces and readable text', () => {
    expect(darkColors.primary).toBe('#38BDF8');
    expect(darkColors.background).toBe('#0B132B');
    expect(darkColors.card).toBe('#152238');
    expect(darkColors.nearBlack).toBe('#F8FAFC');
    expect(darkColors.border).toBe('#1E3A5F');
  });

  test('default backward-compatible export matches light colors', () => {
    expect(colors.primary).toBe(lightColors.primary);
    expect(colors.primaryDark).toBe(lightColors.primaryDark);
    expect(colors.card).toBe(lightColors.card);
  });
});

describe('Dialog Service Bridge', () => {
  test('dialog.show and dialog.alert can be registered and invoked without throwing', () => {
    let lastDialogConfig: any = null;

    dialog.register({
      show: (config) => {
        lastDialogConfig = config;
      },
      dismiss: () => {
        lastDialogConfig = null;
      },
    });

    dialog.alert('Test Title', 'Test message describing an action');
    expect(lastDialogConfig).not.toBeNull();
    expect(lastDialogConfig.title).toBe('Test Title');
    expect(lastDialogConfig.message).toBe('Test message describing an action');
    expect(lastDialogConfig.buttons).toHaveLength(1);
    expect(lastDialogConfig.buttons[0].text).toBe('OK');

    // Test dismiss
    dialog.dismiss();
    expect(lastDialogConfig).toBeNull();
  });

  test('dialog.show supports custom icon badges and action buttons', () => {
    let lastConfig: any = null;

    dialog.register({
      show: (cfg) => {
        lastConfig = cfg;
      },
      dismiss: () => {
        lastConfig = null;
      },
    });

    dialog.show({
      title: 'Confirm Cancellation',
      message: 'Are you sure you want to cancel this booking?',
      icon: 'trash',
      buttons: [
        { text: 'Keep Booking', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive' },
      ],
    });

    expect(lastConfig.icon).toBe('trash');
    expect(lastConfig.buttons).toHaveLength(2);
    expect(lastConfig.buttons[0].style).toBe('cancel');
    expect(lastConfig.buttons[1].style).toBe('destructive');
  });
});
