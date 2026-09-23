jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-brightness
let mockBrightness = 0.45;
let mockRequestedPermissions = false;

jest.mock('expo-brightness', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getBrightnessAsync: jest.fn(async () => mockBrightness),
  setBrightnessAsync: jest.fn(async (val: number) => {
    mockBrightness = val;
  }),
  requestPermissionsAsync: jest.fn(async () => {
    mockRequestedPermissions = true;
    return { status: 'granted' };
  }),
}));

import {
  generateBarcodeBars,
  formatBarcodeLabel,
} from '@/utils/barcode';
import {
  boostBrightnessForScanner,
  restoreScreenBrightness,
  isScannerBrightnessBoosted,
} from '@/utils/brightness';
import type { Member } from '@/domain/types';

describe('Barcode Generator Utility', () => {
  test('generates deterministic optical barcode bars with start and stop guards', () => {
    const bars = generateBarcodeBars('448291', 'SS');
    expect(Array.isArray(bars)).toBe(true);
    expect(bars.length).toBeGreaterThan(15);

    // Verify all bars have positive widths and margins
    for (const seg of bars) {
      expect(seg.width).toBeGreaterThanOrEqual(1);
      expect(seg.width).toBeLessThanOrEqual(4);
      expect(seg.marginRight).toBeGreaterThan(0);
    }
  });

  test('formats human-readable barcode label with guard asterisks', () => {
    const label = formatBarcodeLabel('448291', 'SS');
    expect(label).toBe('* 448291 - SS *');

    const customLabel = formatBarcodeLabel('992813', 'BETH');
    expect(customLabel).toBe('* 992813 - BETH *');

    const defaultLabel = formatBarcodeLabel('', '');
    expect(defaultLabel).toBe('* 448291 - SS *');
  });

  test('handles diverse membership IDs without errors', () => {
    const sampleIds = ['123456', 'MEMBER-789', '000000', '987654'];
    for (const id of sampleIds) {
      const bars = generateBarcodeBars(id, 'SS');
      expect(bars.length).toBeGreaterThan(10);
    }
  });
});

describe('Brightness Manager Utility', () => {
  beforeEach(async () => {
    mockBrightness = 0.4;
    mockRequestedPermissions = false;
    await restoreScreenBrightness(0.4);
  });

  test('boostBrightnessForScanner elevates screen brightness to 1.0 (100%)', async () => {
    expect(isScannerBrightnessBoosted()).toBe(false);

    const prev = await boostBrightnessForScanner();
    expect(prev).toBe(0.4);
    expect(mockBrightness).toBe(1.0);
    expect(isScannerBrightnessBoosted()).toBe(true);
  });

  test('restoreScreenBrightness restores the original brightness level', async () => {
    mockBrightness = 0.35;
    const prev = await boostBrightnessForScanner();
    expect(prev).toBe(0.35);
    expect(mockBrightness).toBe(1.0);

    await restoreScreenBrightness(prev);
    expect(mockBrightness).toBe(0.35);
    expect(isScannerBrightnessBoosted()).toBe(false);
  });

  test('subsequent boost calls return cached original brightness without overwriting', async () => {
    mockBrightness = 0.5;
    const firstPrev = await boostBrightnessForScanner();
    expect(firstPrev).toBe(0.5);

    // Second call should return existing saved brightness
    const secondPrev = await boostBrightnessForScanner();
    expect(secondPrev).toBe(0.5);
    expect(mockBrightness).toBe(1.0);

    await restoreScreenBrightness(firstPrev);
    expect(mockBrightness).toBe(0.5);
  });
});
