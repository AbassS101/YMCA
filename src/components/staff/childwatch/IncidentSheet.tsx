import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { ChipRow, FieldLabel, Sheet } from '@/components/desk/Sheet';
import { ActionButton } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import type { ChildWatchIncident, ChildWatchIncidentType } from '@/domain/types';
import type { RoomChild } from '@/components/staff/dashboards/useChildWatchRoom';
import { childWatchRepo } from '@/repositories/childWatchRepo';

import { SheetError, SheetInput } from './SheetInput';

const TYPES: { key: ChildWatchIncidentType; label: string }[] = [
  { key: 'injury', label: 'Injury' },
  { key: 'illness', label: 'Illness' },
  { key: 'allergy', label: 'Allergy' },
  { key: 'behavior', label: 'Behavior' },
  { key: 'late_pickup', label: 'Late pickup' },
  { key: 'other', label: 'Other' },
];
const SEVERITIES: { key: ChildWatchIncident['severity']; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];
const MIN_LEN = 5;

export function IncidentSheet({
  visible,
  onClose,
  staffId,
  inRoom,
  initialChildId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  staffId: string;
  inRoom: RoomChild[];
  initialChildId?: string;
  onDone: () => void;
}) {
  const { colors: tc } = useTheme();
  const [childId, setChildId] = useState('');
  const [type, setType] = useState<ChildWatchIncidentType>('injury');
  const [severity, setSeverity] = useState<ChildWatchIncident['severity']>('low');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setChildId(initialChildId ?? inRoom[0]?.child.id ?? '');
      setType('injury');
      setSeverity('low');
      setDescription('');
      setActionTaken('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const submit = async () => {
    const selected = inRoom.find((r) => r.child.id === childId);
    if (!selected) return setError('Pick a child.');
    if (description.trim().length < MIN_LEN) return setError(`Describe what happened (at least ${MIN_LEN} characters).`);
    if (actionTaken.trim().length < MIN_LEN) return setError(`Describe the action taken (at least ${MIN_LEN} characters).`);
    try {
      setSaving(true);
      setError(null);
      await childWatchRepo.logIncident(
        {
          visitId: selected.visit.id,
          childId: selected.child.id,
          type,
          severity,
          description: description.trim(),
          actionTaken: actionTaken.trim(),
        },
        staffId
      );
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log the incident.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} title="Log incident" onClose={onClose}>
      <FieldLabel>Child</FieldLabel>
      {inRoom.length === 0 ? (
        <Text style={{ color: tc.textMuted }}>No children are signed in.</Text>
      ) : (
        <ChipRow options={inRoom.map((r) => ({ key: r.child.id, label: r.child.name }))} value={childId} onChange={setChildId} />
      )}
      <FieldLabel>Type</FieldLabel>
      <ChipRow options={TYPES} value={type} onChange={setType} />
      <FieldLabel>Severity</FieldLabel>
      <ChipRow options={SEVERITIES} value={severity} onChange={setSeverity} />
      <FieldLabel>What happened</FieldLabel>
      <SheetInput value={description} onChangeText={setDescription} multiline />
      <FieldLabel>Action taken</FieldLabel>
      <SheetInput value={actionTaken} onChangeText={setActionTaken} multiline />
      <SheetError message={error} />
      <ActionButton label="Log incident" color={tc.primary} onPress={() => void submit()} loading={saving} />
    </Sheet>
  );
}
