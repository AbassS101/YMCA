import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FieldLabel, Sheet } from '@/components/desk/Sheet';
import { ActionButton } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { headcountMismatch } from '@/domain/childWatchStaffing';
import { childWatchRepo } from '@/repositories/childWatchRepo';

import { DANGER, SheetError, SheetInput } from './SheetInput';

export function HeadcountSheet({
  visible,
  onClose,
  staffId,
  expected,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  staffId: string;
  /** Children the sign-in records say are in the room. */
  expected: number;
  onDone: () => void;
}) {
  const { colors: tc } = useTheme();
  const [counted, setCounted] = useState(expected);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCounted(expected);
      setNote('');
      setError(null);
    }
  }, [visible, expected]);

  const diff = headcountMismatch(counted, expected);

  const submit = async () => {
    if (diff !== 0 && note.trim().length === 0) {
      setError('Add a note explaining the mismatch.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await childWatchRepo.recordHeadcount(
        { counted, expected, note: note.trim() || undefined },
        staffId
      );
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record the headcount.');
    } finally {
      setSaving(false);
    }
  };

  const stepper = (label: string, delta: number) => (
    <Pressable
      onPress={() => setCounted((c) => Math.max(0, c + delta))}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: tc.cardBorder, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', color: tc.text }}>{delta > 0 ? '+' : '−'}</Text>
    </Pressable>
  );

  return (
    <Sheet visible={visible} title="Headcount" onClose={onClose}>
      <FieldLabel>Children counted in the room</FieldLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        {stepper('Decrease count', -1)}
        <Text style={{ fontSize: 36, fontWeight: '800', color: tc.text, minWidth: 56, textAlign: 'center' }}>{counted}</Text>
        {stepper('Increase count', 1)}
      </View>
      <Text style={{ textAlign: 'center', color: tc.textMuted, fontSize: 13 }}>Expected from sign-ins: {expected}</Text>
      {diff !== 0 ? (
        <View style={{ backgroundColor: DANGER, borderRadius: 8, padding: 10 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            Mismatch: {Math.abs(diff)} {diff > 0 ? 'more' : 'fewer'} than signed in. A note is required.
          </Text>
        </View>
      ) : null}
      <FieldLabel>{diff !== 0 ? 'Note (required)' : 'Note (optional)'}</FieldLabel>
      <SheetInput value={note} onChangeText={setNote} placeholder="Anything to record" multiline />
      <SheetError message={error} />
      <ActionButton label="Record headcount" color={tc.primary} onPress={() => void submit()} loading={saving} />
    </Sheet>
  );
}
