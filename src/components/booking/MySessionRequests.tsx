import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';

import { SessionRequestCard, SmallButton } from '@/components/booking/SessionRequestCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import type { SessionRequest } from '@/domain/types';
import { sessionRequestRepo } from '@/repositories/lessonRepo';
import { spacing } from '@/theme/typography';

/** Member-facing list of private session requests, with counter-offer Accept/Decline. */
export function MySessionRequests({ onChanged }: { onChanged?: () => void }) {
  const { session, api } = useSession();
  const { colors } = useTheme();
  const memberId = session?.userId ?? '';
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (memberId === '') return;
    try {
      const all = await sessionRequestRepo.list(api, { memberId });
      setRequests(all.filter((r) => r.status === 'pending' || r.status === 'countered'));
    } catch {
      setRequests([]);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (e) {
      dialog.show({
        title: 'Could not update',
        message: e instanceof Error ? e.message : 'Please try again.',
        icon: 'alert',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setBusy(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: colors.text }]} allowFontScaling>
        My session requests
      </Text>
      {requests.map((r) => (
        <SessionRequestCard key={r.id} request={r} perspective="member">
          {r.status === 'countered' ? (
            <>
              <SmallButton
                label="Accept new time"
                disabled={busy === r.id}
                onPress={() => void run(r.id, () => sessionRequestRepo.answerCounter(api, r.id, memberId, 'accept'))}
              />
              <SmallButton
                label="Decline"
                kind="danger"
                disabled={busy === r.id}
                onPress={() => void run(r.id, () => sessionRequestRepo.answerCounter(api, r.id, memberId, 'decline'))}
              />
            </>
          ) : (
            <SmallButton
              label="Cancel request"
              kind="danger"
              disabled={busy === r.id}
              onPress={() => void run(r.id, () => sessionRequestRepo.cancel(api, r.id, memberId))}
            />
          )}
        </SessionRequestCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  heading: { fontSize: 16, fontWeight: '800' },
});
