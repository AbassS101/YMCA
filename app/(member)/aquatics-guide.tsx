import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AquaticsPoliciesModal } from '@/components/AquaticsPoliciesModal';
import { SwimLessonClassCard } from '@/components/SwimLessonClassCard';
import { SwimStagesDiagram } from '@/components/SwimStagesDiagram';
import { YHeader } from '@/components/YHeader';
import { useTheme } from '@/context/ThemeContext';
import {
  AQUATICS_CLASSES,
  AQUATICS_SESSION_INFO,
  CERTIFICATION_PROGRAMS,
  type AquaticsClassOffering,
} from '@/domain/aquaticsGuideData';
import { radii, spacing, tapTarget } from '@/theme/typography';

type ActiveTab = 'classes' | 'curriculum' | 'certifications' | 'info';

export default function AquaticsGuideScreen() {
  const router = useRouter();
  const { colors: tc, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ActiveTab>('classes');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [policyModalVisible, setPolicyModalVisible] = useState<boolean>(false);

  // Filtered swim lesson classes
  const filteredClasses = useMemo(() => {
    return AQUATICS_CLASSES.filter((c) => {
      if (selectedDayFilter !== 'all' && c.day !== selectedDayFilter) {
        return false;
      }
      if (selectedAgeFilter !== 'all') {
        if (selectedAgeFilter === 'parent' && c.ageCategory !== 'Parent/Child') return false;
        if (selectedAgeFilter === 'preschool' && c.ageCategory !== 'Preschool') return false;
        if (selectedAgeFilter === 'youth' && c.ageCategory !== 'Youth') return false;
        if (selectedAgeFilter === 'teen-adult' && c.ageCategory !== 'Teen & Adult') return false;
        if (selectedAgeFilter === 'masters' && c.ageCategory !== 'Adult Masters') return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          c.title.toLowerCase().includes(q) ||
          c.classCode.toLowerCase().includes(q) ||
          c.day.toLowerCase().includes(q) ||
          c.stageCode.toLowerCase().includes(q) ||
          c.ageCategory.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [selectedDayFilter, selectedAgeFilter, searchQuery]);

  const handleOpenEnrollment = async () => {
    try {
      await Linking.openURL('https://www.ymcadc.org');
    } catch {
      // fallback
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <YHeader subtitle="YMCA Silver Spring Aquatics Guide" />

      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Navigation Row */}
        <View style={styles.topNavRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to previous screen"
          >
            <Ionicons name="arrow-back" size={20} color={tc.primary} />
            <Text style={[styles.backText, { color: tc.primary }]}>Back</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(member)/pool-schedule')}
            style={[styles.poolSchedulePill, { backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE' }]}
            accessibilityRole="button"
            accessibilityLabel="View 6-Lane Pool Schedule"
          >
            <Ionicons name="water" size={14} color={tc.primary} />
            <Text style={[styles.poolSchedulePillText, { color: tc.primary }]}>
              6-Lane Pool Schedule ›
            </Text>
          </Pressable>
        </View>

        {/* Hero Banner: "BE STRONG BE CONFIDENT" */}
        <View
          style={[
            styles.heroBanner,
            {
              backgroundColor: isDark ? '#0C2A4A' : '#00609C',
              borderColor: isDark ? '#1D4ED8' : '#004C7D',
            },
          ]}
        >
          <View style={styles.heroTopTagRow}>
            <View style={styles.heroSeasonTag}>
              <Text style={styles.heroSeasonText}>
                {AQUATICS_SESSION_INFO.sessionName}
              </Text>
            </View>
            <Text style={styles.heroDatesText}>
              Sept 08 – Nov 01, 2026
            </Text>
          </View>

          <Text style={styles.heroMottoTitle}>
            BE STRONG.{'\n'}BE CONFIDENT.
          </Text>

          <Text style={styles.heroDescription}>
            YMCA Silver Spring Aquatics Programs empower infants, youth, teens, and adults with lifesaving swim competency, competitive stroke mechanics, and healthy living.
          </Text>

          {/* Registration Key Dates Card */}
          <View style={styles.heroRegistrationBox}>
            <View style={styles.regCol}>
              <Text style={styles.regColLabel}>FULL MEMBERS</Text>
              <Text style={styles.regColDate}>Opens Aug 24</Text>
            </View>
            <View style={styles.regDivider} />
            <View style={styles.regCol}>
              <Text style={styles.regColLabel}>PROGRAM MEMBERS</Text>
              <Text style={styles.regColDate}>Opens Sept 01</Text>
            </View>
            <View style={styles.regDivider} />
            <Pressable
              onPress={handleOpenEnrollment}
              style={styles.heroEnrollBtn}
              accessibilityRole="button"
              accessibilityLabel="Enroll online on ymcadc.org"
            >
              <Text style={styles.heroEnrollBtnText}>Enroll Online ›</Text>
            </Pressable>
          </View>

          <View style={styles.laborDayNoticeRow}>
            <Ionicons name="information-circle" size={14} color="#FDE68A" />
            <Text style={styles.laborDayNoticeText}>
              {AQUATICS_SESSION_INFO.laborDayNotice}
            </Text>
          </View>
        </View>

        {/* 4 Segmented Hub Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {[
            { key: 'classes' as const, label: `Swim Lessons (${AQUATICS_CLASSES.length})`, icon: 'school-outline' },
            { key: 'curriculum' as const, label: 'Stages Curriculum (A–6)', icon: 'map-outline' },
            { key: 'certifications' as const, label: 'Certifications & CPR', icon: 'ribbon-outline' },
            { key: 'info' as const, label: 'Hours & Policies', icon: 'shield-outline' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active
                      ? tc.primary
                      : isDark
                      ? '#1E293B'
                      : '#FFFFFF',
                    borderColor: active ? tc.primary : tc.border,
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={active ? '#FFFFFF' : tc.text}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: active ? '#FFFFFF' : tc.text },
                    active && { fontWeight: '700' },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* TAB 1: SWIM LESSONS (28 Classes) */}
        {activeTab === 'classes' ? (
          <View>
            {/* Search Bar */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: tc.border,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={tc.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search class code (e.g. 02101-20), stage, or age..."
                placeholderTextColor={tc.textMuted}
                style={[styles.searchInput, { color: tc.text }]}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={tc.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Day Filter Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {[
                { key: 'all', label: 'All Days' },
                { key: 'Saturday', label: 'Saturday (14 Classes)' },
                { key: 'Sunday', label: 'Sunday (12 Classes)' },
                { key: 'Monday', label: 'Monday (Masters)' },
                { key: 'Friday', label: 'Friday (Sharon Kelly Free)' },
              ].map((d) => {
                const active = selectedDayFilter === d.key;
                return (
                  <Pressable
                    key={d.key}
                    onPress={() => setSelectedDayFilter(d.key)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: active
                          ? tc.primary
                          : isDark
                          ? '#1E293B'
                          : '#F1F5F9',
                        borderColor: active ? tc.primary : tc.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        { color: active ? '#FFFFFF' : tc.text },
                        active && { fontWeight: '700' },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Age Filter Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {[
                { key: 'all', label: 'All Ages' },
                { key: 'parent', label: 'Parent & Child (6–36m)' },
                { key: 'preschool', label: 'Preschool (Stages 1–4)' },
                { key: 'youth', label: 'Youth (Stages 1–6)' },
                { key: 'teen-adult', label: 'Teen & Adult' },
                { key: 'masters', label: 'Adult Masters' },
              ].map((a) => {
                const active = selectedAgeFilter === a.key;
                return (
                  <Pressable
                    key={a.key}
                    onPress={() => setSelectedAgeFilter(a.key)}
                    style={[
                      styles.ageChip,
                      {
                        backgroundColor: active
                          ? tc.primary
                          : isDark
                          ? '#1E293B'
                          : '#FFFFFF',
                        borderColor: active ? tc.primary : tc.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ageChipText,
                        { color: active ? '#FFFFFF' : tc.text },
                        active && { fontWeight: '700' },
                      ]}
                    >
                      {a.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Results Count Strip */}
            <View style={styles.resultsCountRow}>
              <Text style={[styles.resultsCountText, { color: tc.textMuted }]}>
                Showing <Text style={{ color: tc.primary, fontWeight: '800' }}>{filteredClasses.length}</Text> Swim Lesson Classes
              </Text>
              <Pressable
                onPress={() => setPolicyModalVisible(true)}
                style={styles.policyHelpLink}
                hitSlop={6}
              >
                <Ionicons name="help-circle-outline" size={14} color={tc.primary} />
                <Text style={[styles.policyHelpText, { color: tc.primary }]}>
                  Refund Policies
                </Text>
              </Pressable>
            </View>

            {/* Class Cards */}
            {filteredClasses.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: tc.border,
                  },
                ]}
              >
                <Ionicons name="search-outline" size={32} color={tc.textMuted} />
                <Text style={[styles.emptyTitle, { color: tc.text }]}>
                  No classes match your current filters
                </Text>
                <Pressable
                  onPress={() => {
                    setSelectedDayFilter('all');
                    setSelectedAgeFilter('all');
                    setSearchQuery('');
                  }}
                  style={[styles.resetBtn, { backgroundColor: tc.primary }]}
                >
                  <Text style={styles.resetBtnText}>Clear All Filters</Text>
                </Pressable>
              </View>
            ) : (
              filteredClasses.map((offering) => (
                <SwimLessonClassCard key={offering.id} offering={offering} />
              ))
            )}
          </View>
        ) : null}

        {/* TAB 2: CURRICULUM ROADMAP */}
        {activeTab === 'curriculum' ? (
          <View>
            <SwimStagesDiagram />
          </View>
        ) : null}

        {/* TAB 3: CERTIFICATIONS & TRAINING */}
        {activeTab === 'certifications' ? (
          <View style={styles.certificationsWrap}>
            <View style={styles.certIntroBox}>
              <Text style={[styles.certIntroTitle, { color: tc.text }]}>
                Aquatics Certifications & Community Safety
              </Text>
              <Text style={[styles.certIntroDesc, { color: tc.textMuted }]}>
                Become a certified lifesaver or elevate your aquatic athletic career with our nationally recognized credential programs.
              </Text>
            </View>

            {CERTIFICATION_PROGRAMS.map((cert) => (
              <View
                key={cert.id}
                style={[
                  styles.certCard,
                  {
                    backgroundColor: isDark ? tc.cardBg : '#FFFFFF',
                    borderColor: isDark ? tc.cardBorder : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.certBadgeRow}>
                  <View style={[styles.certProviderBadge, { backgroundColor: tc.primaryLight }]}>
                    <Text style={[styles.certProviderText, { color: tc.primary }]}>
                      {cert.provider.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.certTagPill, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={styles.certTagText}>{cert.badge}</Text>
                  </View>
                </View>

                <Text style={[styles.certTitle, { color: tc.text }]}>
                  {cert.title}
                </Text>

                <Text style={[styles.certDescription, { color: tc.textMuted }]}>
                  {cert.description}
                </Text>

                {/* Requirements info row */}
                <View
                  style={[
                    styles.certRequirementsRow,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.reqCol}>
                    <Ionicons name="person-outline" size={13} color={tc.primary} />
                    <Text style={[styles.reqText, { color: tc.text }]}>
                      {cert.ageRequirement}
                    </Text>
                  </View>
                  <View style={styles.reqCol}>
                    <Ionicons name="time-outline" size={13} color={tc.primary} />
                    <Text style={[styles.reqText, { color: tc.text }]}>
                      {cert.validity}
                    </Text>
                  </View>
                </View>

                {/* Highlights */}
                <View style={styles.certHighlightsList}>
                  <Text style={[styles.certHighlightsTitle, { color: tc.text }]}>
                    Curriculum Highlights:
                  </Text>
                  {cert.curriculumHighlights.map((highlight, idx) => (
                    <View key={idx} style={styles.highlightRow}>
                      <Ionicons name="checkmark-circle" size={14} color={tc.success} />
                      <Text style={[styles.highlightText, { color: tc.textMuted }]}>
                        {highlight}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Enroll / Inquire button */}
                <Pressable
                  onPress={handleOpenEnrollment}
                  style={[styles.certEnrollBtn, { backgroundColor: tc.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Enroll in ${cert.title}`}
                >
                  <Text style={styles.certEnrollBtnText}>
                    Register on Easy to Enroll ›
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* TAB 4: HOURS & POLICIES */}
        {activeTab === 'info' ? (
          <View style={styles.infoWrap}>
            {/* Hours of Operation Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? tc.cardBg : '#FFFFFF',
                  borderColor: isDark ? tc.cardBorder : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <Ionicons name="time" size={18} color={tc.primary} />
                <Text style={[styles.infoCardTitle, { color: tc.text }]}>
                  Pool Operating Hours (Fall 1)
                </Text>
              </View>

              <View style={styles.hoursGrid}>
                {AQUATICS_SESSION_INFO.hours.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.hoursRow,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text style={[styles.hoursDays, { color: tc.text }]}>
                      {h.days}
                    </Text>
                    <View style={styles.hoursDetail}>
                      <Text style={[styles.hoursLabel, { color: tc.primary }]}>
                        Indoor: {h.indoorHours}
                      </Text>
                      <Text style={[styles.hoursLabel, { color: '#D97706' }]}>
                        Outdoor: {h.outdoorHours}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Leadership Contacts Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? tc.cardBg : '#FFFFFF',
                  borderColor: isDark ? tc.cardBorder : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <Ionicons name="people" size={18} color={tc.primary} />
                <Text style={[styles.infoCardTitle, { color: tc.text }]}>
                  Aquatics Leadership Team
                </Text>
              </View>

              <View style={styles.teamGrid}>
                {AQUATICS_SESSION_INFO.contacts.map((contact) => (
                  <View
                    key={contact.email}
                    style={[
                      styles.teamMemberCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: tc.text }]}>
                        {contact.name}
                      </Text>
                      <Text style={[styles.memberRole, { color: tc.primary }]}>
                        {contact.role}
                      </Text>
                      <Text style={[styles.memberEmail, { color: tc.textMuted }]}>
                        {contact.email}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                      style={[styles.memberMailBtn, { backgroundColor: '#E0F2FE' }]}
                    >
                      <Ionicons name="mail" size={15} color="#0284C7" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* Refund & Make-up Policy Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FEF3C7',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <Text style={[styles.infoCardTitle, { color: '#B45309' }]}>
                  YMCA Refund & Cancellation Policies
                </Text>
              </View>

              <View style={styles.rulesList}>
                {AQUATICS_SESSION_INFO.refundPolicy.rules.map((rule, idx) => (
                  <View key={idx} style={styles.ruleRow}>
                    <Text style={[styles.ruleBulletText, { color: '#D97706' }]}>•</Text>
                    <Text style={[styles.ruleBodyText, { color: isDark ? '#FDE68A' : '#78350F' }]}>
                      {rule}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Policies & Guidelines Modal */}
      <AquaticsPoliciesModal
        visible={policyModalVisible}
        onClose={() => setPolicyModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: tapTarget - 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  poolSchedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  poolSchedulePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroBanner: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  heroTopTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSeasonTag: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  heroSeasonText: {
    color: '#0C4A6E',
    fontSize: 10,
    fontWeight: '800',
  },
  heroDatesText: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '600',
  },
  heroMottoTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    lineHeight: 30,
  },
  heroDescription: {
    color: '#E0F2FE',
    fontSize: 13,
    lineHeight: 18,
  },
  heroRegistrationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: 4,
  },
  regCol: {
    gap: 1,
  },
  regColLabel: {
    color: '#BAE6FD',
    fontSize: 9,
    fontWeight: '800',
  },
  regColDate: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  regDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroEnrollBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.button,
  },
  heroEnrollBtnText: {
    color: '#00609C',
    fontSize: 12,
    fontWeight: '800',
  },
  laborDayNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  laborDayNoticeText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '600',
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: spacing.sm,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 11,
  },
  ageChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  ageChipText: {
    fontSize: 11,
  },
  resultsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  resultsCountText: {
    fontSize: 12,
  },
  policyHelpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  policyHelpText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    padding: spacing.xl,
    borderRadius: radii.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.button,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  certificationsWrap: {
    gap: spacing.md,
  },
  certIntroBox: {
    gap: 4,
  },
  certIntroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  certIntroDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  certCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  certBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  certProviderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  certProviderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  certTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  certTagText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  certTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  certDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  certRequirementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  reqCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reqText: {
    fontSize: 11,
    fontWeight: '600',
  },
  certHighlightsList: {
    gap: 4,
  },
  certHighlightsTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightText: {
    fontSize: 11,
    lineHeight: 15,
  },
  certEnrollBtn: {
    paddingVertical: 10,
    borderRadius: radii.button,
    alignItems: 'center',
    marginTop: 4,
  },
  certEnrollBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoWrap: {
    gap: spacing.md,
  },
  infoCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  hoursGrid: {
    gap: 6,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  hoursDays: {
    fontSize: 13,
    fontWeight: '700',
  },
  hoursDetail: {
    alignItems: 'flex-end',
    gap: 1,
  },
  hoursLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  teamGrid: {
    gap: 6,
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '800',
  },
  memberRole: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 11,
  },
  memberMailBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesList: {
    gap: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  ruleBulletText: {
    fontSize: 14,
    lineHeight: 16,
  },
  ruleBodyText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});
