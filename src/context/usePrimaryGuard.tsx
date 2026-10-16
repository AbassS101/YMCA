import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { YHeader } from '@/components/YHeader';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { householdRepo } from '@/repositories/householdRepo';

/**
 * Billing belongs to the primary member of a family plan. Returns the primary's name when the
 * signed-in member is a different person on the plan, otherwise null.
 */
export function usePrimaryGuard(): { primaryName: string | null; checked: boolean } {
  const { session, api } = useSession();
  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const userId = session?.userId;

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (!userId) return;
        const me = await api.getMember(userId);
        if (me.householdId && me.householdId !== me.id) {
          const hh = await householdRepo.get(api, me.id);
          if (alive) setPrimaryName(hh.primary.name);
        } else if (alive) {
          setPrimaryName(null);
        }
      } catch {
        // Not a household member (staff, guest, etc.): nothing to block.
      } finally {
        if (alive) setChecked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api, userId]);

  return { primaryName, checked };
}

export function PrimaryOnlyNotice({ primaryName, action }: { primaryName: string; action: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <YHeader subtitle="Family plan" />
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <AppText style={[styles.title, { color: colors.text }]}>Only {primaryName} can {action}</AppText>
        <AppText style={{ color: colors.textMuted, lineHeight: 20 }}>
          You are on {primaryName}&apos;s family plan. They pay for the membership and manage billing, plan changes and
          cancellation. You can still use your own barcode and see everyone on the plan.
        </AppText>
        <Pressable
          onPress={() => router.back()}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <AppText style={{ color: '#FFFFFF', fontWeight: '700' }}>Go back</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
});
