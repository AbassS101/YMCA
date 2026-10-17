import AsyncStorage from '@react-native-async-storage/async-storage';

import { encodeBarcode, type ScannableSymbology } from '@/utils/barcodeEncoders';

export type WalletCard = {
  /** Raw value read from the physical card's barcode. */
  value: string;
  type: ScannableSymbology;
  savedAt: string;
};

const keyFor = (userId: string) => `ymca.walletCard.v1.${userId}`;

/** True when the value can be redrawn as a real barcode of the given type. */
export function canRenderBarcode(value: string, type: ScannableSymbology): boolean {
  try {
    encodeBarcode(value, type);
    return true;
  } catch {
    return false;
  }
}

export async function loadWalletCard(userId: string): Promise<WalletCard | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WalletCard;
    return parsed?.value && parsed?.type ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveWalletCard(userId: string, card: Omit<WalletCard, 'savedAt'>): Promise<WalletCard> {
  const full: WalletCard = { ...card, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(full));
  return full;
}

export async function removeWalletCard(userId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(userId));
}
