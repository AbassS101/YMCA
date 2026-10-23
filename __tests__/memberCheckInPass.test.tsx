import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { MemberCheckInCard } from '@/components/MemberCheckInCard';
import type { Member } from '@/domain/types';
import { boostBrightnessForScanner, restoreScreenBrightness } from '@/utils/brightness';
import { streakRepo } from '@/repositories/streakRepo';

let mockCard: { value: string; type: string } | null = null;
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/components/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('@/components/ScannedBarcode', () => ({
  ScannedBarcode: (props: any) => require('react').createElement(require('react-native').View, { ...props, testID: 'barcode' }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/context/SessionContext', () => ({ useSession: () => ({ session: { userId: 'member' } }) }));
jest.mock('@/domain/householdAccess', () => ({ facilityAccess: () => ({ gym: { status: 'allowed' } }) }));
jest.mock('@/utils/walletCard', () => ({ loadWalletCard: jest.fn(async () => mockCard) }));
jest.mock('@/utils/brightness', () => ({
  boostBrightnessForScanner: jest.fn(async () => 0.4),
  restoreScreenBrightness: jest.fn(async () => {}),
}));
jest.mock('@/repositories/streakRepo', () => ({
  streakRepo: { getStreakProfile: jest.fn(async () => null), recordCheckIn: jest.fn() },
}));

const member = { id: 'member', name: 'Test Member', membershipId: '000123456789', status: 'active', type: 'Adult' } as Member;

beforeEach(() => { mockCard = null; jest.clearAllMocks(); });

test('directly opened pass encodes the full ID and boosts/restores brightness without inventing a check-in', async () => {
  const screen = render(<MemberCheckInCard member={member} initialExpanded showInlineCard={false} />);
  await act(async () => {});
  expect(screen.getByTestId('barcode').props).toMatchObject({ value: '000123456789', type: 'code128' });
  expect(boostBrightnessForScanner).toHaveBeenCalled();
  await act(async () => fireEvent.press(screen.getByLabelText('Close check-in pass')));
  expect(restoreScreenBrightness).toHaveBeenCalledWith(0.4);
  expect(streakRepo.recordCheckIn).not.toHaveBeenCalled();
  screen.unmount();
});

test('inline and enlarged passes preserve the saved physical card value and symbology', async () => {
  mockCard = { value: '000087654321', type: 'code39' };
  const screen = render(<MemberCheckInCard member={member} initialExpanded />);
  await act(async () => {});
  const barcodes = screen.getAllByTestId('barcode');
  expect(barcodes).toHaveLength(2);
  for (const barcode of barcodes) {
    expect(barcode.props).toMatchObject(mockCard);
  }
  screen.unmount();
});
