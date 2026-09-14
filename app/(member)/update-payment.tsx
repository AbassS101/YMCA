import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { tokenizePayment } from '@/domain/paymentTokenizer';
import { useSession } from '@/context/SessionContext';
import { membershipRepo } from '@/repositories/membershipRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

function expiryOk(raw: string): boolean {
  const m = raw.replace(/\s/g, '').match(/^(\d{2})\/?(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year >= 0 && year <= 99;
}

function cvcOk(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 3 && digits.length <= 4;
}

export default function UpdatePaymentScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const memberId = session?.userId ?? '';

  const [nameOnCard, setNameOnCard] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setFormError(null);
    if (nameOnCard.trim() === '') {
      setFormError('Enter the name on the card.');
      return;
    }
    if (!expiryOk(expiry)) {
      setFormError('Enter expiry as MM/YY.');
      return;
    }
    if (!cvcOk(cvc)) {
      setFormError('Enter a valid CVC.');
      return;
    }

    let brand: string;
    let last4: string;
    try {
      const token = tokenizePayment({ number });
      brand = token.brand;
      last4 = token.last4;
    } catch {
      setFormError('Check the card number.');
      return;
    }

    setLoading(true);
    try {
      await membershipRepo.updatePayment(api, memberId, { brand, last4 });
      router.back();
    } catch {
      setFormError('Could not update payment. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Update payment" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.back}>← Back</Text>
          </Pressable>

          <TextField
            label="Name on card"
            value={nameOnCard}
            onChangeText={setNameOnCard}
            autoCapitalize="words"
            autoComplete="name"
          />
          <TextField
            label="Card number"
            value={number}
            onChangeText={setNumber}
            keyboardType="number-pad"
            autoComplete="cc-number"
          />
          <TextField
            label="Expiry (MM/YY)"
            value={expiry}
            onChangeText={setExpiry}
            keyboardType="number-pad"
            autoComplete="cc-exp"
          />
          <TextField
            label="CVC"
            value={cvc}
            onChangeText={setCvc}
            keyboardType="number-pad"
            autoComplete="cc-csc"
            secureTextEntry
          />

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          <PrimaryButton title="Save payment method" onPress={() => void handleSubmit()} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  back: {
    ...typography.body,
    color: colors.scarlet,
    fontWeight: '600',
    marginBottom: 4,
  },
  error: {
    ...typography.body,
    color: colors.scarlet,
  },
});
