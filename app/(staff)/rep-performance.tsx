import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChipRow } from '@/components/desk/Sheet';
import { KpiRow } from '@/components/staff/KpiTile';
import { StaffScreen } from '@/components/staff/StaffScreen';
import { EmptyState, SectionCard } from '@/components/staff/SectionCard';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { personaForRole } from '@/domain/staffCapabilities';
import type { Staff } from '@/domain/types';
import { deskRepo, type RepKpiPeriod, type RepKpis } from '@/repositories/deskRepo';

const BRANCH_ID = 'silver-spring';

const PERIODS: { key: RepKpiPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

type RepRow = { staff: Staff; kpis: RepKpis };

export default function RepPerformanceScreen() {
  const { api } = useSession();
  const { colors: tc } = useTheme();
  const { can, theme } = useStaffCapabilities();
  const allowed = can('viewRepKpis');
  const [period, setPeriod] = useState<RepKpiPeriod>('week');
  const [branch, setBranch] = useState<RepKpis | null>(null);
  const [reps, setReps] = useState<RepRow[]>([]);

  const load = useCallback(async () => {
    if (!allowed) return;
    const staff = await api.listStaff(BRANCH_ID);
    const desk = staff.filter((s) => personaForRole(s.staffRole) === 'frontDesk');
    const [b, rows] = await Promise.all([
      deskRepo.kpis(api, BRANCH_ID, 'branch', period),
      Promise.all(desk.map(async (s) => ({ staff: s, kpis: await deskRepo.kpis(api, BRANCH_ID, s.id, period) }))),
    ]);
    setBranch(b);
    setReps(rows);
  }, [api, allowed, period]);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => dialog.alert('Error', 'Could not load performance numbers.'));
    }, [load])
  );

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <StaffScreen subtitle="Rep Performance" allowed={allowed}>
      <ChipRow options={PERIODS} value={period} onChange={setPeriod} />

      <SectionCard title="Branch Totals" icon="stats-chart" accent={theme.color} subtitle="All front desk activity">
        <KpiRow
          items={[
            { label: 'Sign-Ins', value: branch?.checkIns ?? 0, icon: 'scan', color: '#15803D' },
            { label: 'Calls', value: branch?.calls ?? 0, icon: 'call', color: theme.color },
            { label: 'Recovered', value: branch?.billingRecovered ?? 0, icon: 'card', color: '#B45309' },
            { label: 'Sold', value: branch?.membershipsSold ?? 0, icon: 'ribbon', color: '#7C3AED' },
          ]}
        />
        <Text style={{ color: tc.textMuted, fontSize: 12 }}>
          Lead conversion {pct(branch?.leadConversionRate ?? 0)} · {branch?.openLeads ?? 0} open leads
        </Text>
      </SectionCard>

      <SectionCard title="By Representative" icon="people" accent={theme.color} count={reps.length}>
        {reps.length === 0 ? (
          <EmptyState icon="person-outline" text="No front desk representatives on the team." />
        ) : (
          reps.map(({ staff, kpis }) => (
            <View key={staff.id} style={[styles.rep, { borderColor: tc.cardBorder }]}>
              <Text style={[styles.name, { color: tc.text }]}>{staff.name}</Text>
              <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                {kpis.checkIns} sign-ins · {kpis.calls} calls · {kpis.billingRecovered} billing recovered · {kpis.membershipsSold} sold
              </Text>
              <Text style={{ color: tc.textMuted, fontSize: 12 }}>
                Lead conversion {pct(kpis.leadConversionRate)} · {kpis.openLeads} open leads
              </Text>
            </View>
          ))
        )}
      </SectionCard>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  rep: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 2 },
  name: { fontSize: 15, fontWeight: '800' },
});
