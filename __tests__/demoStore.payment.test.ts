jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStore, resetStore, saveStore } from '@/storage/demoStore';
import { SEED } from '@/protivity/seed';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('reset loads seed and payment update never stores PAN', async () => {
  await resetStore();
  const state = await loadStore();
  expect(state.memberships[0].paymentLast4).toBe('4242');
  expect(JSON.stringify(state)).not.toMatch(/4242424242424242/);

  const next = {
    ...state,
    memberships: state.memberships.map((m) =>
      m.memberId === 'member-jordan'
        ? { ...m, paymentBrand: 'Visa', paymentLast4: '1111' }
        : m
    ),
  };
  await saveStore(next);
  const reloaded = await loadStore();
  expect(reloaded.memberships[0].paymentLast4).toBe('1111');
  expect(JSON.stringify(reloaded)).not.toMatch(/\d{13,19}/);
  expect(SEED.memberships[0].monthlyAmountCents).toBe(8000);
});
