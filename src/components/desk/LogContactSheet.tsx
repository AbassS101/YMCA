import { useEffect, useState } from 'react';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow, FieldLabel, Sheet } from '@/components/desk/Sheet';
import { getDemoToday } from '@/domain/demoClock';
import type { ContactChannel, ContactOutcome, ContactPurpose, MemberContact } from '@/domain/types';

type ContactInput = Omit<MemberContact, 'id' | 'createdAt' | 'staffId' | 'staffName'>;

const CHANNELS: { key: ContactChannel; label: string }[] = [
  { key: 'call', label: 'Call' },
  { key: 'in_person', label: 'In person' },
  { key: 'sms', label: 'Text' },
  { key: 'email', label: 'Email' },
];
const PURPOSES: { key: ContactPurpose; label: string }[] = [
  { key: 'billing', label: 'Billing' },
  { key: 'sales', label: 'Sales' },
  { key: 'question', label: 'Question' },
  { key: 'welcome', label: 'Welcome' },
  { key: 'retention', label: 'Retention' },
  { key: 'general', label: 'General' },
];
const OUTCOMES: { key: ContactOutcome; label: string }[] = [
  { key: 'resolved', label: 'Resolved' },
  { key: 'card_updated', label: 'Card updated' },
  { key: 'sold', label: 'Sold' },
  { key: 'callback', label: 'Call back' },
  { key: 'voicemail', label: 'Voicemail' },
  { key: 'no_answer', label: 'No answer' },
  { key: 'not_interested', label: 'Not interested' },
];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const FOLLOW_UP_OUTCOMES: ContactOutcome[] = ['callback', 'voicemail', 'no_answer'];

export function LogContactSheet({
  visible,
  title,
  memberId,
  leadId,
  defaultPurpose = 'general',
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  memberId?: string;
  leadId?: string;
  defaultPurpose?: ContactPurpose;
  onClose: () => void;
  onSave: (input: ContactInput) => Promise<void>;
}) {
  const [channel, setChannel] = useState<ContactChannel>('call');
  const [purpose, setPurpose] = useState<ContactPurpose>(defaultPurpose);
  const [outcome, setOutcome] = useState<ContactOutcome>('resolved');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setChannel('call');
      setPurpose(defaultPurpose);
      setOutcome('resolved');
      setNotes('');
      setFollowUp('');
      setError('');
    }
  }, [visible, defaultPurpose]);

  // Suggest a follow-up date when the member could not be reached.
  useEffect(() => {
    if (FOLLOW_UP_OUTCOMES.includes(outcome) && followUp === '') setFollowUp(addDays(getDemoToday(), 1));
    if (!FOLLOW_UP_OUTCOMES.includes(outcome)) setFollowUp('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  const save = async () => {
    if (followUp && !/^\d{4}-\d{2}-\d{2}$/.test(followUp)) {
      setError('Use the follow-up date format YYYY-MM-DD.');
      return;
    }
    setBusy(true);
    try {
      await onSave({ memberId, leadId, channel, purpose, outcome, notes, followUpDate: followUp || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the contact.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {error ? <ErrorBanner message={error} /> : null}
      <FieldLabel>How did you reach them?</FieldLabel>
      <ChipRow options={CHANNELS} value={channel} onChange={setChannel} />
      <FieldLabel>Purpose</FieldLabel>
      <ChipRow options={PURPOSES} value={purpose} onChange={setPurpose} />
      <FieldLabel>Outcome</FieldLabel>
      <ChipRow options={OUTCOMES} value={outcome} onChange={setOutcome} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="What was discussed?" />
      <TextField
        label="Follow-up date (optional, YYYY-MM-DD)"
        value={followUp}
        onChangeText={setFollowUp}
        placeholder="2026-09-15"
        autoCapitalize="none"
      />
      <PrimaryButton title="Save Contact" onPress={() => void save()} loading={busy} />
    </Sheet>
  );
}
