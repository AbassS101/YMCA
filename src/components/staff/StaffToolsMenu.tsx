import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppConfig } from '@/context/AppConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { useSession } from '@/context/SessionContext';
import { useStaffCapabilities } from '@/context/useStaffCapabilities';
import { canOpenAdminCenter } from '@/domain/adminCenter';

type Tool = { label: string; detail: string; route: string; icon: keyof typeof Ionicons.glyphMap; group: string; visible?: boolean };

/** A single, role-aware directory available from every staff header. */
export function StaffToolsMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: tc } = useTheme();
  const { can, canEditSection, statsScopes, theme } = useStaffCapabilities();
  const { config } = useAppConfig();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const tools: Tool[] = [
    { label: 'Today', detail: 'Your daily workspace', route: '/(staff)/today', icon: 'sunny-outline', group: 'Daily work' },
    { label: 'Schedules', detail: 'Classes, attendance and events', route: '/(staff)/schedules', icon: 'calendar-outline', group: 'Daily work' },
    { label: 'Pool schedule', detail: 'Indoor and outdoor pools, hours and lanes', route: '/(staff)/schedules?view=pool', icon: 'water-outline', group: 'Daily work' },
    { label: 'Members & clients', detail: 'Member profiles and your assigned clients', route: '/(staff)/members', icon: 'people-outline', group: 'Daily work' },
    { label: 'Messages', detail: 'Member conversations', route: '/(staff)/messages', icon: 'chatbubbles-outline', group: 'Daily work' },
    { label: 'Availability', detail: 'Weekly hours and private session windows', route: '/(staff)/trainer-availability', icon: 'time-outline', group: 'Daily work', visible: can('manageOwnLessonSlots') || can('manageAllLessonSlots') },
    { label: 'Maintenance', detail: can('manageMaintenance') ? 'Manage facility reports and repairs' : 'Report a facility issue', route: '/(staff)/maintenance', icon: 'construct-outline', group: 'Branch operations' },
    { label: 'Child Watch', detail: 'Room roster, check-in and pickup', route: '/(staff)/child-watch', icon: 'happy-outline', group: 'Branch operations', visible: config.featureToggles.childWatch && can('runChildWatchRoom') },
    { label: 'Staff directory', detail: 'Staff accounts, roles and team details', route: '/(staff)/staff-management', icon: 'id-card-outline', group: 'Branch operations', visible: can('manageStaff') || can('manageTrainers') },
    { label: 'Announcements', detail: 'Branch notices and member updates', route: '/(staff)/announcements', icon: 'megaphone-outline', group: 'Branch operations', visible: can('broadcast') },
    { label: 'Feedback', detail: 'Complaints, suggestions and responses', route: '/(staff)/complaints-suggestions', icon: 'chatbox-outline', group: 'Branch operations', visible: can('manageComplaints') },
    { label: 'Surveys', detail: 'Collect and review member feedback', route: '/(staff)/surveys', icon: 'list-outline', group: 'Branch operations', visible: can('manageSurveys') },
    { label: 'Leads', detail: 'Follow-ups and membership sales', route: '/(staff)/leads', icon: 'person-add-outline', group: 'Membership & reporting', visible: can('manageLeads') },
    { label: 'Billing issues', detail: 'Review outstanding member payments', route: '/(staff)/billing-issues', icon: 'card-outline', group: 'Membership & reporting', visible: can('handleBillingIssues') },
    { label: 'Campaigns', detail: 'Membership offers and promotions', route: '/(staff)/campaigns', icon: 'pricetag-outline', group: 'Membership & reporting', visible: can('manageCampaigns') },
    { label: 'Rep performance', detail: 'Sales and service activity', route: '/(staff)/rep-performance', icon: 'trending-up-outline', group: 'Membership & reporting', visible: can('viewRepKpis') },
    { label: 'Reports & exports', detail: 'Membership, attendance and department results', route: '/(staff)/stats', icon: 'bar-chart-outline', group: 'Membership & reporting', visible: statsScopes.length > 0 },
    { label: 'Lesson pricing', detail: 'Training and swim lesson packages', route: '/(staff)/lesson-pricing', icon: 'cash-outline', group: 'Administration', visible: canEditSection('lessonPricing') },
    { label: 'Admin center', detail: 'Branch pricing, programs and configuration', route: '/(staff)/admin-center', icon: 'options-outline', group: 'Administration', visible: canOpenAdminCenter(session?.role) },
    { label: 'My account', detail: 'Profile, appearance and account switching', route: '/(staff)/me', icon: 'person-circle-outline', group: 'Account' },
    { label: 'Settings', detail: 'Notifications, accessibility and preferences', route: '/(staff)/settings', icon: 'settings-outline', group: 'Account' },
  ];
  const matches = tools.filter((tool) => tool.visible !== false && `${tool.label} ${tool.detail}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = [...new Set(matches.map((tool) => tool.group))];
  return (
    <>
      <Pressable onPress={() => { setQuery(''); setOpen(true); }} style={styles.trigger} accessibilityRole="button" accessibilityLabel="Open staff tools">
        <Ionicons name="grid-outline" size={21} color="#1E293B" />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Dismiss staff tools" />
          <View style={[styles.sheet, { backgroundColor: tc.background, paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.header}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.title, { color: tc.text }]} accessibilityRole="header">Staff tools</Text>
                <Text style={{ color: tc.textMuted, fontSize: 13 }}>{theme.title} · Silver Spring</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={styles.close} accessibilityRole="button" accessibilityLabel="Close staff tools"><Ionicons name="close" size={24} color={tc.text} /></Pressable>
            </View>
            <View style={[styles.search, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
              <Ionicons name="search-outline" size={19} color={tc.textMuted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Find a staff tool" placeholderTextColor={tc.textMuted} style={{ flex: 1, color: tc.text, fontSize: 15, minHeight: 44 }} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search staff tools" />
              {query ? <Pressable onPress={() => setQuery('')} style={styles.close} accessibilityRole="button" accessibilityLabel="Clear tool search"><Ionicons name="close-circle" size={19} color={tc.textMuted} /></Pressable> : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 22, paddingBottom: 16 }}>
              {groups.map((group) => <View key={group} style={{ gap: 8 }}>
                <Text style={[styles.group, { color: tc.textMuted }]} accessibilityRole="header">{group}</Text>
                <View style={[styles.list, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
                  {matches.filter((tool) => tool.group === group).map((tool) => <Pressable key={tool.label} onPress={() => { setOpen(false); router.push(tool.route as never); }} style={({ pressed }) => [styles.row, { borderColor: tc.cardBorder }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={tool.label}>
                    <Ionicons name={tool.icon} size={21} color={tc.primary} />
                    <View style={{ flex: 1, gap: 3 }}><Text style={{ color: tc.text, fontSize: 15, fontWeight: '600' }}>{tool.label}</Text><Text style={{ color: tc.textMuted, fontSize: 12, lineHeight: 17 }}>{tool.detail}</Text></View>
                    <Ionicons name="chevron-forward" size={16} color={tc.textMuted} />
                  </Pressable>)}
                </View>
              </View>)}
              {matches.length === 0 ? <Text style={{ color: tc.textMuted, paddingVertical: 24, textAlign: 'center' }}>No tools match “{query}”. Try another search.</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: '#00000066', alignItems: 'flex-end' },
  sheet: { width: '100%', maxWidth: 540, flex: 1, paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  group: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  list: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
