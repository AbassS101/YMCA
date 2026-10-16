import { useState } from 'react';
import { Text, View } from 'react-native';

import { Sheet } from '@/components/desk/Sheet';
import { ActionButton } from '@/components/staff/SectionCard';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import type { ChildWatchAuthorizedPickup } from '@/domain/types';
import { childWatchRepo } from '@/repositories/childWatchRepo';

import { DANGER, SheetError } from './SheetInput';

export function PickupApprovalsSheet({
  visible,
  onClose,
  staffId,
  pickups,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  staffId: string;
  pickups: ChildWatchAuthorizedPickup[];
  onDone: () => void;
}) {
  const { colors: tc } = useTheme();
  const { can } = useStaffCapabilities();
  const allowed = can('manageChildWatchProgram');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (id: string, decision: 'approved' | 'revoked') => {
    if (!allowed) return setError('Only the Child Watch director can review pickup people.');
    try {
      setBusyId(id);
      setError(null);
      await childWatchRepo.reviewAuthorizedPickup(id, decision, staffId);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the decision.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet visible={visible && allowed} title="Pickup approvals" onClose={onClose}>
      {pickups.length === 0 ? <Text style={{ color: tc.textMuted }}>No pickup people are waiting for approval.</Text> : null}
      {pickups.map((p) => (
        <View key={p.id} style={{ borderWidth: 1, borderColor: tc.cardBorder, borderRadius: 10, padding: 12, gap: 8 }}>
          <Text style={{ color: tc.text, fontWeight: '800', fontSize: 15 }}>{p.name}</Text>
          <Text style={{ color: tc.textMuted, fontSize: 13 }}>
            {p.relationship} · {p.phone}
            {p.idType ? ` · ${p.idType}${p.idLast4 ? ` ••${p.idLast4}` : ''}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ActionButton label="Approve" color={tc.primary} onPress={() => void decide(p.id, 'approved')} loading={busyId === p.id} />
            <ActionButton label="Revoke" color={DANGER} variant="outline" onPress={() => void decide(p.id, 'revoked')} loading={busyId === p.id} />
          </View>
        </View>
      ))}
      <SheetError message={error} />
    </Sheet>
  );
}
