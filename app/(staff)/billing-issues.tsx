import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { BillingIssueCard } from '@/components/desk/BillingIssueCard';
import { ChipRow } from '@/components/desk/Sheet';
import { LogContactSheet } from '@/components/desk/LogContactSheet';
import { UpdateCardSheet } from '@/components/desk/UpdateCardSheet';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { EmptyState, ListRow, SectionCard } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { formatShortDate } from '@/domain/displayDates';
import type { BillingIssueRow, Member, MemberContact, Staff } from '@/domain/types';
import { deskRepo } from '@/repositories/deskRepo';

const BRANCH_ID = 'silver-spring';
type Filter = 'all' | 'declined' | 'past_due' | 'recovered';

export default function BillingIssuesScreen() {
  const router = useRouter();
  const { api, session } = useSession();
  const { can, theme } = useStaffCapabilities();
  const staffId = session?.userId ?? '';
  const allowed = can('handleBillingIssues');

  const [rows, setRows] = useState<BillingIssueRow[]>([]);
  const [recovered, setRecovered] = useState<{ contact: MemberContact; member?: Member }[]>([]);
  const [me, setMe] = useState<Staff | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [logFor, setLogFor] = useState<BillingIssueRow | null>(null);
  const [cardFor, setCardFor] = useState<BillingIssueRow | null>(null);

  const load = useCallback(async () => {
    if (!allowed || !staffId) return;
    const [issues, contacts, members, staff] = await Promise.all([
      deskRepo.listBillingIssues(api, BRANCH_ID, staffId),
      deskRepo.listContacts(api),
      api.listAllMembers(BRANCH_ID),
      api.getStaff(staffId).catch(() => null),
    ]);
    const byId = new Map(members.map((m) => [m.id, m]));
    setRows(issues);
    setMe(staff);
    setRecovered(
      contacts
        .filter((c) => c.purpose === 'billing' && (c.outcome === 'card_updated' || c.outcome === 'resolved'))
        .map((contact) => ({ contact, member: contact.memberId ? byId.get(contact.memberId) : undefined }))
    );
  }, [api, staffId, allowed]);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => dialog.alert('Error', 'Could not load billing issues.'));
    }, [load])
  );

  const shown = rows.filter((r) => filter === 'all' || r.membership.billingStatus === filter);
  const repName = me?.name ?? 'your Y membership rep';

  return (
    <StaffScreen
      subtitle="Billing Issues"
      allowed={allowed}
      overlay={
        <>
          <LogContactSheet
            visible={logFor !== null}
            title={`Log call: ${logFor?.member.name ?? ''}`}
            memberId={logFor?.member.id}
            defaultPurpose="billing"
            onClose={() => setLogFor(null)}
            onSave={async (input) => {
              await deskRepo.logContact(api, input, staffId);
              setLogFor(null);
              await load();
            }}
          />
          <UpdateCardSheet
            visible={cardFor !== null}
            memberName={cardFor?.member.name ?? ''}
            currentLast4={cardFor?.membership.paymentLast4}
            onClose={() => setCardFor(null)}
            onSubmit={async (payment) => {
              if (!cardFor) return;
              await deskRepo.resolveBillingIssue(api, cardFor.member.id, payment, staffId);
              setCardFor(null);
              await load();
            }}
          />
        </>
      }
    >
      <ChipRow<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: `All (${rows.length})` },
          { key: 'declined', label: 'Declined' },
          { key: 'past_due', label: 'Past due' },
          { key: 'recovered', label: `Recovered (${recovered.length})` },
        ]}
      />

      {filter === 'recovered' ? (
        <SectionCard title="Recovered" icon="checkmark-circle" accent="#15803D" count={recovered.length}>
          {recovered.length === 0 ? (
            <EmptyState icon="card-outline" text="No recovered accounts yet." />
          ) : (
            recovered.map(({ contact, member }) => (
              <ListRow
                key={contact.id}
                title={member?.name ?? 'Member'}
                subtitle={contact.notes || 'Billing resolved'}
                meta={`${contact.staffName} · ${formatShortDate(contact.createdAt)}`}
                onPress={member ? () => router.push(`/(staff)/members/${member.id}`) : undefined}
              />
            ))
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Call Queue" icon="card" accent={theme.color} count={shown.length} subtitle="Oldest failures first">
          {shown.length === 0 ? (
            <EmptyState icon="happy-outline" text="Nothing to chase here." />
          ) : (
            shown.map((row) => (
              <BillingIssueCard
                key={row.member.id}
                row={row}
                repName={repName}
                onOpen={() => router.push(`/(staff)/members/${row.member.id}`)}
                onLog={() => setLogFor(row)}
                onUpdateCard={() => setCardFor(row)}
              />
            ))
          )}
        </SectionCard>
      )}
    </StaffScreen>
  );
}
