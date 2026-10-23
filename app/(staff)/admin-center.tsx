import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text } from 'react-native';

import { StaffScreen } from '@/components/staff/StaffScreen';
import { ListRow, SectionCard } from '@/components/staff/SectionCard';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { adminCenterTiles, type AdminTileGroup } from '@/domain/adminCenter';

const GROUPS: { title: AdminTileGroup; icon: 'pricetags' | 'newspaper' | 'settings' | 'shield-checkmark' | 'document-text'; subtitle: string }[] = [
  { title: 'Pricing & Deals', icon: 'pricetags', subtitle: 'What members pay, and the offers that reduce it' },
  { title: 'Member Content', icon: 'newspaper', subtitle: 'Information members read around the app' },
  { title: 'Operations', icon: 'settings', subtitle: 'Rules the branch runs on' },
  { title: 'System', icon: 'shield-checkmark', subtitle: 'IT only' },
  { title: 'Records', icon: 'document-text', subtitle: 'An audit trail of every settings change' },
];

export default function AdminCenterScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { colors: tc } = useTheme();
  const { theme } = useStaffCapabilities();
  const tiles = useMemo(() => adminCenterTiles(session?.role), [session?.role]);

  return (
    <StaffScreen subtitle="Admin Control Center" allowed={tiles.length > 0}>
      <Text style={{ color: tc.textMuted, fontSize: 13 }}>
        Change prices, deals, and branch settings here. Changes apply right away and are recorded in the change log.
      </Text>
      {GROUPS.map((g) => {
        const rows = tiles.filter((t) => t.group === g.title);
        if (rows.length === 0) return null;
        return (
          <SectionCard key={g.title} title={g.title} icon={g.icon} accent={theme.color} subtitle={g.subtitle}>
            {rows.map((t) => (
              <ListRow
                key={t.key}
                title={t.title}
                subtitle={t.subtitle}
                left={<Ionicons name={t.icon} size={20} color={theme.color} />}
                right={<Ionicons name="chevron-forward" size={18} color={tc.textMuted} />}
                onPress={() => router.push(t.route as never)}
              />
            ))}
          </SectionCard>
        );
      })}
    </StaffScreen>
  );
}
