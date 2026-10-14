import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { Sheet } from '@/components/desk/Sheet';
import { useTheme } from '@/context/ThemeContext';
import { tokenizePaymentInput } from '@/domain/paymentTokenizer';

export function UpdateCardSheet({
  visible,
  memberName,
  currentLast4,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  memberName: string;
  currentLast4?: string;
  onClose: () => void;
  onSubmit: (payment: { brand: string; last4: string }) => Promise<void>;
}) {
  const { colors: tc } = useTheme();
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setNumber('');
      setExpiry('');
      setCvc('');
      setError('');
    }
  }, [visible]);

  const submit = async () => {
    const token = tokenizePaymentInput({ cardNumber: number, expiry, cvc });
    if (!token.valid) {
      setError(token.error ?? 'Check the card details.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ brand: token.brand, last4: token.last4 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the card.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title={`Update card for ${memberName}`} onClose={onClose}>
      {currentLast4 ? (
        <Text style={{ color: tc.textMuted, fontSize: 13 }}>On file: card ending {currentLast4}</Text>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      <TextField label="Card number" value={number} onChangeText={setNumber} keyboardType="number-pad" placeholder="4242 4242 4242 4242" />
      <TextField label="Expiry (MM/YY)" value={expiry} onChangeText={setExpiry} keyboardType="number-pad" placeholder="08/29" />
      <TextField label="CVC" value={cvc} onChangeText={setCvc} keyboardType="number-pad" placeholder="123" secureTextEntry />
      <PrimaryButton title="Save Card & Clear Billing Issue" onPress={() => void submit()} loading={busy} />
    </Sheet>
  );
}
