import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { CameraView } from 'expo-camera';
import WalletCardScreen from '../app/(member)/wallet-card';

const mockRefreshPermission = jest.fn(async () => ({ granted: true }));
jest.mock('expo-camera', () => ({
  CameraView: (props: any) => require('react').createElement(require('react-native').View, { ...props, testID: 'camera' }),
  useCameraPermissions: () => [{ granted: true }, jest.fn(), mockRefreshPermission],
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/components/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('@/components/ScannedBarcode', () => ({ ScannedBarcode: () => null }));
jest.mock('@/context/DialogContext', () => ({ dialog: { alert: jest.fn() } }));
jest.mock('@/context/SessionContext', () => ({ useSession: () => ({ session: { userId: 'member' } }) }));
jest.mock('@/utils/brightness', () => ({ boostBrightnessForScanner: jest.fn(), restoreScreenBrightness: jest.fn() }));
jest.mock('@/utils/walletCard', () => ({
  loadWalletCard: jest.fn(async () => null),
  canRenderBarcode: jest.fn(() => true),
}));

test('iPhone uses the system scanner and returns a scanned card for confirmation', async () => {
  const originalOS = Platform.OS;
  Platform.OS = 'ios';
  let onScan: (result: { type: string; data: string }) => void = () => {};
  const remove = jest.fn();
  const launchScanner = jest.fn(async () => {});
  const dismissScanner = jest.fn(async () => {});
  Object.assign(CameraView, {
    isModernBarcodeScannerAvailable: true,
    launchScanner,
    dismissScanner,
    onModernBarcodeScanned: (callback: typeof onScan) => {
      onScan = callback;
      return { remove };
    },
  });
  const screen = await render(<WalletCardScreen />);
  try {
    await act(async () => {});
    expect(screen.queryByTestId('camera')).toBeNull();
    await act(async () => fireEvent.press(screen.getByText('Scan card barcode')));
    expect(launchScanner).toHaveBeenCalledWith(expect.objectContaining({
      barcodeTypes: ['code128', 'code39', 'codabar', 'itf14'],
    }));
    await act(async () => onScan({ type: 'org.iso.Code39', data: '123456' }));
    expect(screen.getByText('Does this match the number on your card?')).toBeTruthy();
    expect(screen.getByText('123456')).toBeTruthy();
    expect(dismissScanner).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  } finally {
    await screen.unmount();
    Object.assign(CameraView, { isModernBarcodeScannerAvailable: false });
    Platform.OS = originalOS;
  }
});

test('keeps the native camera mounted through permission dialogs and background/resume', async () => {
  const originalState = AppState.currentState;
  AppState.currentState = null as any;
  let change: (state: AppStateStatus) => void = () => {};
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    change = callback;
    return { remove: jest.fn() };
  });
  const screen = await render(<WalletCardScreen />);
  try {
    await act(async () => {});
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(screen.getByText('Starting camera…')).toBeTruthy();
    await fireEvent(screen.getByTestId('camera'), 'cameraReady');
    expect(screen.queryByText('Starting camera…')).toBeNull();
    const camera = screen.getByTestId('camera');
    expect(camera.props.autofocus).toBe('on');
    await act(() => change('inactive'));
    expect(screen.getByTestId('camera')).toBeTruthy();
    await act(() => change('background'));
    expect(screen.getByTestId('camera')).toBe(camera);
    await act(async () => change('active'));
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(screen.getByTestId('camera')).toBe(camera);
    expect(screen.queryByText('Starting camera…')).toBeNull();
    jest.useFakeTimers();
    await fireEvent.press(screen.getByText('Restart camera'));
    expect(screen.queryByTestId('camera')).toBeNull();
    await act(() => jest.advanceTimersByTime(499));
    expect(screen.queryByTestId('camera')).toBeNull();
    await act(() => jest.advanceTimersByTime(1));
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(screen.getByTestId('camera')).not.toBe(camera);
  } finally {
    await screen.unmount();
    jest.useRealTimers();
    listener.mockRestore();
    AppState.currentState = originalState;
  }
});
