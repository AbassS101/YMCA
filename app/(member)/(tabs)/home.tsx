import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BillingHero } from '@/components/BillingHero';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ScheduleRow } from '@/components/ScheduleRow';
import { YHeader } from '@/components/YHeader';
import { getDemoToday } from '@/domain/demoClock';
import type { Member, Membership, ScheduleItem } from '@/domain/types';
import { useSession } from '@/context/SessionContext';
import { membershipRepo } from '@/repositories/membershipRepo';
import { savedClassesRepo } from '@/repositories/savedClassesRepo';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';
const BRANCH_ADDRESS = '9800 Hastings Drive, Silver Spring, MD 20901';
const HOURS_WEEKDAY = 'Mon–Fri 5:30am–10pm';
const HOURS_WEEKEND = 'Sat 7am–8pm · Sun 8am–8pm';

function formatBillingDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function membershipSubtitle(member: Member, membership: Membership): string {
  return `${member.type} · ${formatCents(membership.monthlyAmountCents)} · ${membership.paymentBrand} ••${membership.paymentLast4}`;
}

function formatClassTime(isoStart: string): string {
  return new Date(isoStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MemberHomeScreen() {
  const { session, api } = useSession();
  const memberId = session?.userId ?? '';

  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [savedItems, setSavedItems] = useState<ScheduleItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (memberId === '') {
      return;
    }
    try {
      setError(false);
      const today = getDemoToday();
      const [nextMember, nextMembership, saved, schedules] = await Promise.all([
        api.getMember(memberId),
        membershipRepo.getMembership(api, memberId),
        savedClassesRepo.list(memberId),
        scheduleRepo.list(api, {
          branchId: BRANCH_ID,
          from: today,
          to: addDays(today, 6),
        }),
      ]);
      const idSet = new Set(saved.map((s) => s.scheduleItemId));
      const resolved = schedules
        .filter((item) => idSet.has(item.id))
        .sort((a, b) => a.start.localeCompare(b.start));
      setMember(nextMember);
      setMembership(nextMembership);
      setSavedIds(idSet);
      setSavedItems(resolved);
    } catch {
      setError(true);
    }
  }, [api, memberId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onToggleStar = async (scheduleItemId: string) => {
    if (memberId === '') {
      return;
    }
    await savedClassesRepo.toggle(memberId, scheduleItemId);
    await load();
  };

  const firstName = member?.name.split(' ')[0] ?? '';

  return (
    <View style={styles.screen}>
      <YHeader subtitle={firstName ? `Hi, ${firstName}` : 'Home'} />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        {membership && member ? (
          <BillingHero
            nextBillingDateLabel={formatBillingDateLabel(membership.nextBillingDate)}
            subtitle={membershipSubtitle(member, membership)}
          />
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Branch hours</Text>
          <Text style={styles.bodyText}>{HOURS_WEEKDAY}</Text>
          <Text style={styles.bodyText}>{HOURS_WEEKEND}</Text>
          <Text style={[styles.bodyText, styles.address]}>{BRANCH_ADDRESS}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your saved classes</Text>
          {savedItems.length === 0 ? (
            <Text style={styles.muted}>Save classes from Schedules to see them here.</Text>
          ) : (
            savedItems.map((item) => (
              <ScheduleRow
                key={item.id}
                time={formatClassTime(item.start)}
                title={item.title}
                location={item.location}
                instructor={item.instructorName}
                starred={savedIds.has(item.id)}
                onToggleStar={() => void onToggleStar(item.id)}
              />
            ))
          )}
        </View>

        {member ? (
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              {member.status === 'active' ? 'Active' : 'Cancellation pending'} · ID {member.membershipId}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scroll: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  bodyText: {
    ...typography.body,
    color: colors.nearBlack,
  },
  address: {
    color: colors.muted,
    marginTop: 4,
  },
  muted: {
    ...typography.body,
    color: colors.muted,
  },
  statusRow: {
    paddingTop: 8,
  },
  statusText: {
    ...typography.label,
    color: colors.muted,
  },
});
