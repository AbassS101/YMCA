import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import type { UserRole } from '@/domain/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const DEMO_PASSWORD = 'ymca-demo';

const JORDAN_EMAIL = 'jordan@silverspring.ymca';
const ALEX_EMAIL = 'alex@silverspring.ymca';

function routeForRole(role: UserRole): '/(member)/home' | '/(staff)/today' {
  return role === 'staff' ? '/(staff)/today' : '/(member)/home';
}

export default function LoginScreen() {
  const router = useRouter();
  const { session, ready, login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (ready && session != null) {
    return <Redirect href={routeForRole(session.role)} />;
  }

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const trimmed = email.trim();
      const next = await login(trimmed, password);
      router.replace(routeForRole(next.role));
    } catch {
      setError('Check email or password.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(nextEmail: string) {
    setEmail(nextEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Member & staff sign in" />
      {error ? <ErrorBanner message={error} /> : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
          <PrimaryButton title="Sign in" onPress={() => void handleSignIn()} loading={loading} />
          <View style={styles.demoRow}>
            <Pressable
              onPress={() => fillDemo(JORDAN_EMAIL)}
              style={styles.demoButton}
              accessibilityRole="button"
            >
              <Text style={styles.demoLabel}>Fill Jordan (member)</Text>
            </Pressable>
            <Pressable
              onPress={() => fillDemo(ALEX_EMAIL)}
              style={styles.demoButton}
              accessibilityRole="button"
            >
              <Text style={styles.demoLabel}>Fill Alex (staff)</Text>
            </Pressable>
          </View>
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
  form: {
    padding: 24,
    gap: 16,
  },
  demoRow: {
    gap: 10,
    marginTop: 8,
  },
  demoButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  demoLabel: {
    ...typography.body,
    color: colors.nearBlack,
    textAlign: 'center',
  },
});
