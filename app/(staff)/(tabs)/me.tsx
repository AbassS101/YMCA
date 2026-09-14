import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { YHeader } from '@/components/YHeader';
import type { Staff } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

function branchLabel(branchId: string): string {
  if (branchId === 'silver-spring') {
    return 'YMCA Silver Spring';
  }
  return branchId;
}

export default function StaffMeScreen() {
  const router = useRouter();
  const { session, api, logout } = useSession();
  const staffId = session?.userId ?? '';

  const [staff, setStaff] = useState<Staff | null>(null);
  const [error, setError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    if (staffId === '') {
      return;
    }
    try {
      setError(false);
      setStaff(await api.getStaff(staffId));
    } catch {
      setError(true);
    }
  }, [api, staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Me" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        {staff ? (
          <View style={styles.card}>
            <Text style={styles.name}>{staff.name}</Text>
            <Text style={styles.row}>{staff.roleLabel}</Text>
            <Text style={styles.row}>{branchLabel(staff.homeBranchId)}</Text>
            <Text style={styles.meta}>{staff.email}</Text>
          </View>
        ) : null}
        <PrimaryButton title="Log out" onPress={() => void handleLogout()} loading={loggingOut} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  row: {
    ...typography.body,
    color: colors.nearBlack,
  },
  meta: {
    ...typography.body,
    color: colors.muted,
    marginTop: 4,
  },
});
