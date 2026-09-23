import { Platform } from 'react-native';

let expoBrightness: typeof import('expo-brightness') | null = null;
try {
  // Dynamically require so if native module is absent or on test runner, it won't crash
  expoBrightness = require('expo-brightness');
} catch {
  expoBrightness = null;
}

export type BrightnessState = {
  isBoosted: boolean;
  originalBrightness: number | null;
  supported: boolean;
};

let savedBrightness: number | null = null;
let isCurrentlyBoosted = false;

/**
 * Checks if programmatic brightness adjustment is available on the current platform.
 */
export async function isBrightnessSupported(): Promise<boolean> {
  if (Platform.OS === 'web' || !expoBrightness) {
    return false;
  }
  try {
    if (typeof expoBrightness.isAvailableAsync === 'function') {
      return await expoBrightness.isAvailableAsync();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the current screen brightness level (0.0 to 1.0).
 */
export async function getScreenBrightness(): Promise<number | null> {
  if (Platform.OS === 'web' || !expoBrightness) {
    return null;
  }
  try {
    if (typeof expoBrightness.getBrightnessAsync === 'function') {
      return await expoBrightness.getBrightnessAsync();
    }
  } catch (err) {
    console.warn('[Brightness] Failed to get brightness:', err);
  }
  return null;
}

/**
 * Boosts screen brightness to maximum (1.0 / 100%) for scanning.
 * Saves the original brightness level so it can be restored.
 * Returns the previous brightness level, or null if unsupported.
 */
export async function boostBrightnessForScanner(): Promise<number | null> {
  if (isCurrentlyBoosted) {
    return savedBrightness;
  }

  if (Platform.OS === 'web' || !expoBrightness) {
    isCurrentlyBoosted = true;
    return 0.5; // Mock/web baseline
  }

  try {
    // Request permission if needed
    if (typeof expoBrightness.requestPermissionsAsync === 'function') {
      const permission = await expoBrightness.requestPermissionsAsync().catch(() => null);
      if (permission && permission.status !== 'granted') {
        console.info('[Brightness] Permission not granted, proceeding with visual high-contrast mode');
      }
    }

    // Capture current brightness before elevating
    if (typeof expoBrightness.getBrightnessAsync === 'function') {
      const current = await expoBrightness.getBrightnessAsync();
      savedBrightness = typeof current === 'number' && !isNaN(current) ? current : 0.5;
    } else {
      savedBrightness = 0.5;
    }

    // Elevate brightness to maximum
    if (typeof expoBrightness.setBrightnessAsync === 'function') {
      await expoBrightness.setBrightnessAsync(1.0);
    }

    isCurrentlyBoosted = true;
    return savedBrightness;
  } catch (err) {
    console.warn('[Brightness] Could not boost brightness:', err);
    isCurrentlyBoosted = true;
    return savedBrightness;
  }
}

/**
 * Restores the screen brightness to its previous value before the scanner was activated.
 */
export async function restoreScreenBrightness(targetBrightness?: number | null): Promise<void> {
  const restoreValue = targetBrightness !== undefined ? targetBrightness : savedBrightness;
  isCurrentlyBoosted = false;
  savedBrightness = null;

  if (Platform.OS === 'web' || !expoBrightness || restoreValue === null || restoreValue === undefined) {
    return;
  }

  try {
    if (typeof expoBrightness.setBrightnessAsync === 'function') {
      // Clamp to valid [0.0, 1.0] range
      const clamped = Math.max(0.1, Math.min(1.0, restoreValue));
      await expoBrightness.setBrightnessAsync(clamped);
    }
  } catch (err) {
    console.warn('[Brightness] Could not restore brightness:', err);
  }
}

/**
 * Returns whether brightness is currently in boosted scanner mode.
 */
export function isScannerBrightnessBoosted(): boolean {
  return isCurrentlyBoosted;
}
