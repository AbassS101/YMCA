import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { UserAvatar } from '@/components/UserAvatar';
import { BroadcastNoticeModal } from '@/components/staff/BroadcastNoticeModal';
import { KpiRow } from '@/components/staff/KpiTile';
import { PersonaHero } from '@/components/staff/PersonaHero';
import { QuickActionBar } from '@/components/staff/QuickActionBar';
import { ActionButton, EmptyState, ListRow, SectionCard, StatusPill } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { getDemoToday } from '@/domain/demoClock';
import { formatShortDate } from '@/domain/displayDates';
import type { CancelRequest, ComplaintSuggestion, Member, Membership, Staff } from '@/domain/types';
import { membershipRepo } from '@/repositories/membershipRepo';
import { streakRepo } from '@/repositories/streakRepo';
import { colors } from '@/theme/colors';

import { DashboardScaffold } from './DashboardScaffold';
import { BRANCH_ID, formatLongDate } from './format';

const GUEST_PLAN = '1-Day Guest Pass';
const NEW_MEMBER_WINDOW_DAYS = 30;

type MemberWithPlan = { member: Member; membership: Membership | null };

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T12:00:00`).getTime();
  const to = new Date(`${toIso.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function statusTone(status: Member['status']): { label: string; color: string; bg: string } {
  switch (status) {
    case 'active':
      return { label: 'ACTIVE', color: '#15803D', bg: '#DCFCE7' };
    case 'paused':
      return { label: 'PAUSED', color: '#B45309', bg: '#FEF3C7' };
    case 'cancel_pending':
      return { label: 'CANCEL PENDING', color: colors.scarlet, bg: '#FEE2E2' };
    default:
      return { label: 'CANCELLED', color: '#475467', bg: '#F1F5F9' };
  }
}

export function MembershipDirectorDashboard({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const { can, theme, isMembershipDirector } = useStaffCapabilities();
  const canDecide = can('approveCancellations');

  const [profile, setProfile] = useState<Staff | null>(null);
  const [rows, setRows] = useState<MemberWithPlan[]>([]);
  const [cancels, setCancels] = useState<CancelRequest[]>([]);
  const [feedback, setFeedback] = useState<ComplaintSuggestion[]>([]);
  const [checkedInToday, setCheckedInToday] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [error, setError] = useState(false);

  const today = getDemoToday();

  const load = useCallback(async () => {
    if (staffId === '') return;
    try {
      setError(false);
      const [me, members, pending, complaints] = await Promise.all([
        api.getStaff(staffId).catch(() => null),
        api.listAllMembers(BRANCH_ID),
        api.listPendingCancels(BRANCH_ID),
        api.listComplaintsSuggestions(BRANCH_ID).catch(() => []),
      ]);
      const [withPlans, streaks] = await Promise.all([
        Promise.all(
          members.map(async (member) => ({
            member,
            membership: await api.getMembership(member.id).catch(() => null),
          }))
        ),
        Promise.all(members.map((m) => streakRepo.getStreakProfile(m.id).catch(() => null))),
      ]);
      const checked = new Set<string>();
      streaks.forEach((p, i) => {
        if (p?.checkInDates.includes(today)) checked.add(members[i].id);
      });

      setProfile(me);
      setRows(withPlans);
      setCancels(pending);
      setFeedback(complaints.filter((c) => c.status !== 'resolved'));
      setCheckedInToday(checked);
    } catch {
      setError(true);
    }
  }, [api, staffId, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const memberById = useMemo(() => {
    const map: Record<string, Member> = {};
    for (const r of rows) map[r.member.id] = r.member;
    return map;
  }, [rows]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, '');
    return rows
      .filter(
        ({ member: m }) =>
          m.name.toLowerCase().includes(q) ||
          m.membershipId.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (digits.length >= 3 && m.phone.replace(/\D/g, '').includes(digits))
      )
      .slice(0, 5);
  }, [rows, query]);

  const planChanges = rows.filter((r) => r.membership?.pendingChange);
  const guestPasses = rows.filter((r) => r.member.type === GUEST_PLAN && r.member.status === 'active');
  const newMembers = rows.filter((r) => {
    const joined = r.membership?.joinedDate;
    if (!joined || r.member.type === GUEST_PLAN) return false;
    const age = daysBetween(joined, today);
    return age >= 0 && age <= NEW_MEMBER_WINDOW_DAYS;
  });
  const activeCount = rows.filter((r) => r.member.status === 'active' && r.member.type !== GUEST_PLAN).length;

  const checkIn = async (member: Member) => {
    setBusyId(member.id);
    try {
      const result = await streakRepo.recordCheckIn(member.id, { source: 'manual', note: 'Front desk check-in' });
      setCheckedInToday((prev) => new Set(prev).add(member.id));
      dialog.alert(
        result.isNewCheckIn ? 'Checked In' : 'Already Checked In',
        result.isNewCheckIn
          ? `${member.name} is checked in. ${result.profile.totalCheckIns} total visits.`
          : `${member.name} already checked in today.`,
        [{ text: 'OK' }],
        'checkmark'
      );
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not record check-in.');
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (cancel: CancelRequest) => {
    setBusyId(cancel.memberId);
    try {
      await membershipRepo.approveCancel(api, cancel.memberId, staffId);
      dialog.alert(
        'Cancellation Approved',
        `${memberById[cancel.memberId]?.name ?? 'Member'} keeps access through ${formatShortDate(cancel.accessThrough)}.`,
        [{ text: 'OK' }],
        'checkmark'
      );
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not approve cancellation.');
    } finally {
      setBusyId(null);
    }
  };

  const keepMember = async (cancel: CancelRequest) => {
    setBusyId(cancel.memberId);
    try {
      await membershipRepo.rescindCancel(api, cancel.memberId, staffId);
      dialog.alert('Member Retained', 'Cancellation rescinded and membership restored.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch (err: any) {
      dialog.alert('Error', err?.message || 'Could not rescind cancellation.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardScaffold
      subtitle={isMembershipDirector ? 'Membership Director · Front Desk' : 'Front Desk & Member Services'}
      error={error}
      onRetry={() => void load()}
      overlay={<BroadcastNoticeModal visible={broadcastVisible} onClose={() => setBroadcastVisible(false)} />}
    >
      <PersonaHero
        theme={theme}
        name={profile?.name ?? 'Front Desk'}
        avatarUrl={profile?.avatarUrl}
        roleLabel={profile?.roleLabel}
        dateLabel={formatLongDate(today)}
      >
        <KpiRow
          items={[
            { label: 'Active Members', value: activeCount, icon: 'people', color: theme.color },
            { label: 'Checked In Today', value: checkedInToday.size, icon: 'scan', color: '#15803D' },
            { label: 'Pending Cancels', value: cancels.length, icon: 'alert-circle', color: colors.scarlet },
            { label: 'Plan Changes', value: planChanges.length, icon: 'swap-horizontal', color: '#D97706' },
          ]}
        />
      </PersonaHero>

      <QuickActionBar
        actions={[
          { key: 'members', label: can('createMembers') ? 'New Member' : 'Members', icon: 'person-add-outline', onPress: () => router.push('/(staff)/members'), color: theme.color },
          ...(can('broadcast')
            ? [{ key: 'notice', label: 'Broadcast', icon: 'megaphone-outline' as const, onPress: () => setBroadcastVisible(true), color: '#B45309' }]
            : []),
          ...(can('manageComplaints')
            ? [{ key: 'feedback', label: 'Feedback Inbox', icon: 'chatbubbles-outline' as const, onPress: () => router.push('/(staff)/complaints-suggestions'), color: '#0284C7' }]
            : []),
          { key: 'msg', label: 'Messages', icon: 'mail-outline', onPress: () => router.push('/(staff)/messages'), color: '#15803D' },
        ]}
      />

      <SectionCard title="Front Desk Check-In" icon="scan" accent={theme.color} subtitle="Search by name, member ID, email or phone">
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. Jordan or YMCA-1042"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search members to check in"
        />
        {query.trim() === '' ? null : searchResults.length === 0 ? (
          <EmptyState icon="search-outline" text="No members match that search." />
        ) : (
          searchResults.map(({ member, membership }) => {
            const tone = statusTone(member.status);
            const checked = checkedInToday.has(member.id);
            const blocked = member.status === 'cancelled' || member.status === 'paused';
            return (
              <ListRow
                key={member.id}
                title={member.name}
                subtitle={`${member.membershipId} · ${member.type}`}
                meta={membership?.cancelEffectiveDate ? `Access through ${formatShortDate(membership.cancelEffectiveDate)}` : undefined}
                left={<UserAvatar uri={member.avatarUrl} name={member.name} size={38} />}
                onPress={() => router.push(`/(staff)/members/${member.id}`)}
                right={
                  <View style={styles.rightCol}>
                    <StatusPill label={tone.label} color={tone.color} bg={tone.bg} />
                    {checked ? (
                      <StatusPill label="IN TODAY" color="#15803D" bg="#DCFCE7" />
                    ) : blocked ? null : (
                      <ActionButton
                        label="Check In"
                        icon="log-in-outline"
                        color="#15803D"
                        loading={busyId === member.id}
                        onPress={() => void checkIn(member)}
                      />
                    )}
                  </View>
                }
              />
            );
          })
        )}
      </SectionCard>

      <SectionCard
        title="Cancellation Requests"
        icon="alert-circle"
        accent={colors.scarlet}
        count={cancels.length}
        subtitle={canDecide ? 'You approve or retain each request' : 'The Membership Director reviews these'}
      >
        {cancels.length === 0 ? (
          <EmptyState icon="happy-outline" text="No pending cancellation requests." />
        ) : (
          cancels.map((c) => {
            const m = memberById[c.memberId];
            return (
              <View key={c.id} style={[styles.cancel, { borderColor: tc.cardBorder }]}>
                <View style={styles.cancelTop}>
                  <UserAvatar uri={m?.avatarUrl} name={m?.name ?? 'Member'} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: tc.text }]}>{m?.name ?? 'Member'}</Text>
                    <Text style={[styles.meta, { color: tc.textMuted }]}>
                      Requested {formatShortDate(c.requestedAt)} · access through {formatShortDate(c.accessThrough)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.reason, { color: tc.text }]}>&ldquo;{c.reason}&rdquo;</Text>
                {canDecide ? (
                  <View style={styles.actions}>
                    <ActionButton
                      label="Keep Member"
                      icon="heart"
                      color="#15803D"
                      loading={busyId === c.memberId}
                      onPress={() => void keepMember(c)}
                    />
                    <ActionButton
                      label="Approve"
                      icon="checkmark-circle-outline"
                      color={colors.scarlet}
                      variant="outline"
                      loading={busyId === c.memberId}
                      onPress={() => void approve(c)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </SectionCard>

      <SectionCard title="Scheduled Plan Changes" icon="swap-horizontal" accent="#D97706" count={planChanges.length}>
        {planChanges.length === 0 ? (
          <EmptyState icon="swap-horizontal-outline" text="No plan changes are scheduled." />
        ) : (
          planChanges.map(({ member, membership }) => (
            <ListRow
              key={member.id}
              title={member.name}
              subtitle={`${membership?.rateName} → ${membership?.pendingChange?.planName}`}
              meta={`Effective ${formatShortDate(membership?.pendingChange?.effectiveDate ?? today)} · $${(
                (membership?.pendingChange?.monthlyAmountCents ?? 0) / 100
              ).toFixed(2)}/mo`}
              left={<UserAvatar uri={member.avatarUrl} name={member.name} size={36} />}
              onPress={() => router.push(`/(staff)/members/${member.id}`)}
            />
          ))
        )}
      </SectionCard>

      <SectionCard
        title="New Members & Guest Passes"
        icon="sparkles"
        accent="#0284C7"
        count={newMembers.length + guestPasses.length}
        subtitle={`Joined in the last ${NEW_MEMBER_WINDOW_DAYS} days, plus active day passes`}
      >
        {newMembers.length + guestPasses.length === 0 ? (
          <EmptyState icon="person-outline" text="No new members or active guest passes." />
        ) : (
          [...newMembers, ...guestPasses].map(({ member, membership }) => {
            const isGuest = member.type === GUEST_PLAN;
            return (
              <ListRow
                key={member.id}
                title={member.name}
                subtitle={isGuest ? 'Guest pass · convert to membership' : `${member.type} · joined ${formatShortDate(membership?.joinedDate ?? today)}`}
                left={<UserAvatar uri={member.avatarUrl} name={member.name} size={36} />}
                right={
                  <StatusPill
                    label={isGuest ? 'GUEST' : 'NEW'}
                    color={isGuest ? '#B45309' : '#0284C7'}
                    bg={isGuest ? '#FEF3C7' : '#E0F2FE'}
                  />
                }
                onPress={() => router.push(`/(staff)/members/${member.id}`)}
              />
            );
          })
        )}
      </SectionCard>

      {can('manageComplaints') ? (
        <SectionCard
          title="Open Member Feedback"
          icon="chatbubbles"
          accent="#0284C7"
          count={feedback.length}
          actionLabel="Inbox"
          onAction={() => router.push('/(staff)/complaints-suggestions')}
        >
          {feedback.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" text="All member feedback is resolved." />
          ) : (
            feedback.slice(0, 4).map((f) => (
              <ListRow
                key={f.id}
                title={f.title}
                subtitle={`${f.type === 'complaint' ? 'Complaint' : 'Suggestion'} · ${f.isAnonymous ? 'Anonymous' : f.memberName ?? 'Member'}`}
                right={
                  <StatusPill
                    label={f.status === 'submitted' ? 'NEW' : 'IN REVIEW'}
                    color={f.status === 'submitted' ? colors.scarlet : '#B45309'}
                    bg={f.status === 'submitted' ? '#FEE2E2' : '#FEF3C7'}
                  />
                }
                onPress={() => router.push('/(staff)/complaints-suggestions')}
              />
            ))
          )}
        </SectionCard>
      ) : null}
    </DashboardScaffold>
  );
}

const styles = StyleSheet.create({
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cancel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cancelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    marginTop: 1,
  },
  reason: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
