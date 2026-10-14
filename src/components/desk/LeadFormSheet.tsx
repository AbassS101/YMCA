import { useEffect, useState } from 'react';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ChipRow, FieldLabel, Sheet } from '@/components/desk/Sheet';
import { YMCA_MEMBERSHIP_PLANS, type Lead, type LeadSource } from '@/domain/types';

const SOURCES: { key: LeadSource; label: string }[] = [
  { key: 'walk_in', label: 'Walk-in' },
  { key: 'phone', label: 'Phone' },
  { key: 'guest_pass', label: 'Guest pass' },
  { key: 'lapsed_member', label: 'Lapsed member' },
  { key: 'referral', label: 'Referral' },
  { key: 'web', label: 'Web' },
];

const POPULAR_PLANS = ['adult', 'adult-oney', 'family-1', 'family-2', 'senior-adult', 'young-adult', 'youth'];

export type LeadFormValues = Pick<Lead, 'name' | 'phone' | 'email' | 'source' | 'notes' | 'interestPlanId' | 'nextFollowUpDate'>;

export function LeadFormSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (values: LeadFormValues) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('walk_in');
  const [planId, setPlanId] = useState('adult');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setEmail('');
      setSource('walk_in');
      setPlanId('adult');
      setNotes('');
      setFollowUp('');
      setError('');
    }
  }, [visible]);

  const save = async () => {
    if (!name.trim()) return setError('Name is required.');
    if (!phone.trim() && !email.trim()) return setError('Add a phone number or an email so we can follow up.');
    if (followUp && !/^\d{4}-\d{2}-\d{2}$/.test(followUp)) return setError('Use the date format YYYY-MM-DD.');
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        source,
        notes: notes.trim(),
        interestPlanId: planId,
        nextFollowUpDate: followUp || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the lead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title="New Sales Lead" onClose={onClose}>
      {error ? <ErrorBanner message={error} /> : null}
      <TextField label="Full name *" value={name} onChangeText={setName} placeholder="Jane Prospect" />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="(301) 555-0100" />
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="jane@example.com" />
      <FieldLabel>Lead source</FieldLabel>
      <ChipRow options={SOURCES} value={source} onChange={setSource} />
      <FieldLabel>Interested in</FieldLabel>
      <ChipRow
        options={POPULAR_PLANS.map((id) => ({
          key: id,
          label: YMCA_MEMBERSHIP_PLANS.find((p) => p.id === id)?.name ?? id,
        }))}
        value={planId}
        onChange={setPlanId}
      />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Goals, questions, best time to call" />
      <TextField label="Follow-up date (optional, YYYY-MM-DD)" value={followUp} onChangeText={setFollowUp} autoCapitalize="none" placeholder="YYYY-MM-DD" />
      <PrimaryButton title="Save Lead" onPress={() => void save()} loading={busy} />
    </Sheet>
  );
}
