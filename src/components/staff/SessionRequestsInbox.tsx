import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DateTimeWheelPicker } from '@/components/DateTimeWheelPicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextField } from '@/components/TextField';
import { SessionRequestCard, SmallButton } from '@/components/booking/SessionRequestCard';
import { EmptyState, SectionCard } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { getDemoToday } from '@/domain/demoClock';
import type { SessionRequest } from '@/domain/types';
import { sessionRequestRepo } from '@/repositories/lessonRepo';
import { radii } from '@/theme/typography';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Mode = { kind: 'counter' | 'decline'; request: SessionRequest } | null;

/** Instructor inbox: accept, decline, or offer another time for private session requests. */
export function SessionRequestsInbox({ staffId, accent, onChanged }: { staffId: string; accent: string; onChanged?: () => void }) {
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [date, setDate] = useState(getDemoToday());
  const [time, setTime] = useState('09:00');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const all = await sessionRequestRepo.list(api, { staffId });
      setRequests(
        all.filter(
          (r) =>
            r.status === 'pending' ||
            r.status === 'countered' ||
            (r.status === 'accepted' && r.paymentTiming === 'after')
        )
      );
    } catch {
      setRequests([]);
    }
  }, [api, staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (e) {
      dialog.alert('Could not update', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const openMode = (kind: 'counter' | 'decline', request: SessionRequest) => {
    setDate(localDate(request.start));
    setTime(localTime(request.start));
    setNote('');
    setMode({ kind, request });
  };

  const submitMode = async () => {
    if (!mode) return;
    const { kind, request } = mode;
    setMode(null);
    await run(request.id, () =>
      kind === 'decline'
        ? sessionRequestRepo.respond(api, request.id, staffId, { action: 'decline', note: note.trim() || undefined })
        : sessionRequestRepo.respond(api, request.id, staffId, {
            action: 'counter',
            start: `${date}T${time}:00-04:00`,
            note: note.trim() || undefined,
          })
    );
  };

  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <SectionCard
      title="Session Requests"
      icon="mail-unread-outline"
      accent={accent}
      count={pending}
      subtitle="Accept, decline, or offer another time"
    >
      {requests.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" text="No requests waiting. Members request times inside your availability." />
      ) : (
        requests.map((r) => (
          <SessionRequestCard key={r.id} request={r} perspective="staff">
            {r.status === 'pending' ? (
              <>
                <SmallButton
                  label="Accept"
                  disabled={busy === r.id}
                  onPress={() =>
                    void run(r.id, () => sessionRequestRepo.respond(api, r.id, staffId, { action: 'accept' }))
                  }
                />
                <SmallButton label="Other time" kind="secondary" disabled={busy === r.id} onPress={() => openMode('counter', r)} />
                <SmallButton label="Decline" kind="danger" disabled={busy === r.id} onPress={() => openMode('decline', r)} />
              </>
            ) : r.status === 'countered' ? (
              <Text style={{ color: tc.textMuted, fontSize: 12 }}>Waiting for the member to answer your offer.</Text>
            ) : (
              <Text style={{ color: tc.gold, fontSize: 12, fontWeight: '700' }}>Payment due after session</Text>
            )}
          </SessionRequestCard>
        ))
      )}

      <Modal visible={mode !== null} animationType="fade" transparent onRequestClose={() => setMode(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: tc.background }]}>
            <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.title, { color: tc.text }]}>
                {mode?.kind === 'counter' ? 'Offer another time' : 'Decline request'}
              </Text>
              {mode?.kind === 'counter' ? (
                <DateTimeWheelPicker
                  selectedDate={date}
                  onDateChange={setDate}
                  selectedTime={time}
                  onTimeChange={setTime}
                  label="New time"
                  daysCount={14}
                />
              ) : null}
              <TextField
                label="Note to member (optional)"
                value={note}
                onChangeText={setNote}
                placeholder={mode?.kind === 'counter' ? 'I am free then instead' : 'Sorry, I am out that day'}
              />
              <PrimaryButton
                title={mode?.kind === 'counter' ? 'Send offer' : 'Decline'}
                onPress={() => void submitMode()}
              />
              <SecondaryButton title="Cancel" onPress={() => setMode(null)} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, padding: 16, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '800' },
});
