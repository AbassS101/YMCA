import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { FieldLabel, Sheet } from '@/components/desk/Sheet';
import { ActionButton } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import type { ChildWatchIncident } from '@/domain/types';
import { childWatchRepo } from '@/repositories/childWatchRepo';

import { SheetError, SheetInput } from './SheetInput';

export function IncidentReviewSheet({
  incident,
  childName,
  onClose,
  staffId,
  onDone,
}: {
  /** Null keeps the sheet closed. */
  incident: ChildWatchIncident | null;
  childName?: string;
  onClose: () => void;
  staffId: string;
  onDone: () => void;
}) {
  const { colors: tc } = useTheme();
  const { can } = useStaffCapabilities();
  const allowed = can('manageChildWatchProgram');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote('');
    setError(null);
  }, [incident?.id]);

  const submit = async () => {
    if (!incident) return;
    if (!allowed) return setError('Only the Child Watch director can review incidents.');
    if (note.trim().length === 0) return setError('A review note is required.');
    try {
      setSaving(true);
      setError(null);
      await childWatchRepo.reviewIncident(incident.id, note.trim(), staffId);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={incident !== null} title="Review incident" onClose={onClose}>
      {incident ? (
        <>
          <Text style={{ color: tc.text, fontWeight: '700' }}>
            {childName ? `${childName} · ` : ''}
            {incident.type.replace('_', ' ')} · {incident.severity} severity
          </Text>
          <Text style={{ color: tc.textMuted, fontSize: 12 }}>{new Date(incident.at).toLocaleString()}</Text>
          <FieldLabel>What happened</FieldLabel>
          <Text style={{ color: tc.text }}>{incident.description}</Text>
          <FieldLabel>Action taken</FieldLabel>
          <Text style={{ color: tc.text }}>{incident.actionTaken}</Text>
          <Text style={{ color: tc.textMuted, fontSize: 12 }}>
            {incident.parentAcknowledgedAt
              ? 'Parent acknowledged.'
              : incident.parentNotifiedAt
                ? 'Parent notified, not yet acknowledged.'
                : 'Parent not yet notified.'}
          </Text>
          <FieldLabel>Review note (required)</FieldLabel>
          <SheetInput value={note} onChangeText={setNote} multiline />
          <SheetError message={error} />
          <ActionButton label="Mark reviewed" color={tc.primary} onPress={() => void submit()} loading={saving} />
        </>
      ) : null}
    </Sheet>
  );
}
