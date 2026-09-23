import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { dialog } from '@/context/DialogContext';
import type { NotificationDigestFrequency, NotificationPreferences } from '@/domain/types';
import { notificationRepo } from '@/repositories/notificationRepo';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const DIGEST_OPTIONS: { key: NotificationDigestFrequency; label: string; sub: string }[] = [
  { key: 'instant', label: 'Instant', sub: 'Real-time alert' },
  { key: 'daily', label: 'Daily', sub: 'Once a day at 6 PM' },
  { key: 'weekly', label: 'Weekly', sub: 'Sunday morning' },
  { key: 'none', label: 'Off', sub: 'No emails' },
];

const QUIET_HOUR_PRESETS = [
  { label: '10:00 PM – 7:00 AM', start: '22:00', end: '07:00' },
  { label: '11:00 PM – 8:00 AM', start: '23:00', end: '08:00' },
  { label: '9:00 PM – 6:00 AM', start: '21:00', end: '06:00' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, api } = useSession();
  const { colors: tc, isDark } = useTheme();

  const userId = session?.userId ?? '';
  const isStaff = session?.role !== 'member';

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!api || !userId) return;
    try {
      setLoading(true);
      const data = await notificationRepo.getPreferences(api, userId);
      setPrefs(data);
    } catch {
      dialog.alert('Error', 'Could not load your notification preferences.');
    } finally {
      setLoading(false);
    }
  }, [api, userId]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const updateField = <K extends keyof NotificationPreferences>(
    key: K,
    val: NotificationPreferences[K]
  ) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: val } : prev));
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    if (!api || !userId || !prefs) return;
    try {
      setSaving(true);
      const updated = await notificationRepo.updatePreferences(api, userId, prefs);
      setPrefs(updated);
      setSavedSuccess(true);
      dialog.alert('Preferences Saved', 'Your notification settings have been updated.', [{ text: 'OK' }], 'checkmark');
    } catch {
      dialog.alert('Error', 'Could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!api || !userId) return;
    const defaults: Partial<NotificationPreferences> = {
      mentions: true,
      topicReplies: true,
      classForumAlerts: true,
      staffInquiries: isStaff,
      announcements: true,
      events: true,
      directMessages: true,
      emailDigest: isStaff ? 'instant' : 'daily',
      pushEnabled: true,
      inAppBannerEnabled: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
    try {
      setSaving(true);
      const updated = await notificationRepo.updatePreferences(api, userId, defaults);
      setPrefs(updated);
      setSavedSuccess(true);
      dialog.alert('Preferences Reset', 'Reset to recommended YMCA default settings.', [{ text: 'OK' }], 'checkmark');
    } catch {
      dialog.alert('Error', 'Could not reset preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: tc.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: tc.textMuted }]}>
          Loading notification preferences...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 14),
            backgroundColor: tc.cardBg,
            borderBottomColor: tc.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={tc.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: tc.text }]}>Notification Settings</Text>
          <Text style={[styles.headerSub, { color: tc.textMuted }]}>
            Customize @ mentions, discussions & alert channels
          </Text>
        </View>
        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={[styles.headerSaveBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Save notification preferences"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.headerSaveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Intro banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1E293B' : '#E0F2FE', borderColor: colors.primary }]}>
          <Ionicons name="notifications-circle" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>
              Control What Reaches You
            </Text>
            <Text style={[styles.infoBannerText, { color: isDark ? '#94A3B8' : '#0369A1' }]}>
              Choose which community interactions, @ tags, and branch updates send you notifications.
            </Text>
          </View>
        </View>

        {/* SECTION 1: COMMUNITY & FORUM ALERTS */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Community & Forum Discussions</Text>
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            {/* @ Mentions */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="at" size={18} color="#4F46E5" />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>@ Mentions & Tags</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Notify me when someone mentions my name in a forum topic or reply
                </Text>
              </View>
              <Switch
                value={prefs.mentions}
                onValueChange={(val) => updateField('mentions', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tc.border }]} />

            {/* Replies to My Topics */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="chatbubbles" size={18} color="#16A34A" />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>Replies to My Topics</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Notify me when members or staff reply to topics I created
                </Text>
              </View>
              <Switch
                value={prefs.topicReplies}
                onValueChange={(val) => updateField('topicReplies', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tc.border }]} />

            {/* Class Chat & Announcements */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar" size={18} color="#D97706" />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>Class Chats & Announcements</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Alerts for instructor updates and messages in classes I attend
                </Text>
              </View>
              <Switch
                value={prefs.classForumAlerts}
                onValueChange={(val) => updateField('classForumAlerts', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Staff-only: Inquiries toggle */}
            {isStaff ? (
              <>
                <View style={[styles.divider, { backgroundColor: tc.border }]} />
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: '#FCE7F3' }]}>
                    <Ionicons name="business" size={18} color="#DB2777" />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowTitle, { color: tc.text }]}>@ Staff Desk Inquiries</Text>
                    <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                      Alerts when members tag @All Staff Desk for help or questions
                    </Text>
                  </View>
                  <Switch
                    value={prefs.staffInquiries}
                    onValueChange={(val) => updateField('staffInquiries', val)}
                    trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* SECTION 2: YMCA BRANCH & SYSTEM NOTICES */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>YMCA Branch & Facility Updates</Text>
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            {/* Announcements */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="megaphone" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>Branch Announcements</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Emergency closures, heated pool notices, holiday hours, schedule changes
                </Text>
              </View>
              <Switch
                value={prefs.announcements}
                onValueChange={(val) => updateField('announcements', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tc.border }]} />

            {/* Events */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>Event Notices</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Reminders for community events, youth camps, and branch workshops
                </Text>
              </View>
              <Switch
                value={prefs.events}
                onValueChange={(val) => updateField('events', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tc.border }]} />

            {/* Direct Messages */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="mail" size={18} color="#DC2626" />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>Direct Messages</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  1-on-1 messages with assigned trainers and staff desk
                </Text>
              </View>
              <Switch
                value={prefs.directMessages}
                onValueChange={(val) => updateField('directMessages', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* SECTION 3: DELIVERY CHANNELS */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Delivery Channels</Text>
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            {/* In-App Center */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="notifications" size={18} color={tc.text} />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>In-App Notification Center</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Show notification bell badge and inbox in the YMCA app
                </Text>
              </View>
              <Switch
                value={prefs.inAppBannerEnabled}
                onValueChange={(val) => updateField('inAppBannerEnabled', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tc.border }]} />

            {/* Push Notifications */}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="phone-portrait" size={18} color={tc.text} />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>Push Notifications</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Display alerts on your device home and lock screen
                </Text>
              </View>
              <Switch
                value={prefs.pushEnabled}
                onValueChange={(val) => updateField('pushEnabled', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tc.border }]} />

            {/* Email Digest */}
            <View style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="mail-open-outline" size={18} color={colors.primary} />
                <Text style={[styles.rowTitle, { color: tc.text }]}>Email Summary Digest</Text>
              </View>
              <View style={styles.digestRow}>
                {DIGEST_OPTIONS.map((opt) => {
                  const isSelected = prefs.emailDigest === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => updateField('emailDigest', opt.key)}
                      style={[
                        styles.digestChip,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                          borderColor: isSelected ? colors.primary : tc.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.digestChipTitle,
                          { color: isSelected ? '#FFFFFF' : tc.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.digestChipSub,
                          { color: isSelected ? 'rgba(255,255,255,0.85)' : tc.textMuted },
                        ]}
                      >
                        {opt.sub}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 4: QUIET HOURS / DO NOT DISTURB */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Quiet Hours (Do Not Disturb)</Text>
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#FDF4FF' }]}>
                <Ionicons name="moon" size={18} color="#A855F7" />
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: tc.text }]}>Enable Quiet Hours</Text>
                <Text style={[styles.rowSubtitle, { color: tc.textMuted }]}>
                  Silence push alerts during scheduled rest hours
                </Text>
              </View>
              <Switch
                value={prefs.quietHoursEnabled}
                onValueChange={(val) => updateField('quietHoursEnabled', val)}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {prefs.quietHoursEnabled ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4, gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: tc.textMuted }}>
                  Preset Quiet Time Windows:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {QUIET_HOUR_PRESETS.map((preset) => {
                    const isMatch =
                      prefs.quietHoursStart === preset.start && prefs.quietHoursEnd === preset.end;
                    return (
                      <Pressable
                        key={preset.label}
                        onPress={() => {
                          setPrefs((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  quietHoursStart: preset.start,
                                  quietHoursEnd: preset.end,
                                }
                              : prev
                          );
                        }}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isMatch
                              ? isDark
                                ? '#3B0764'
                                : '#F3E8FF'
                              : isDark
                                ? '#1E293B'
                                : '#F1F5F9',
                            borderColor: isMatch ? '#A855F7' : tc.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isMatch ? 'checkmark-circle' : 'time-outline'}
                          size={14}
                          color={isMatch ? '#A855F7' : tc.textMuted}
                        />
                        <Text
                          style={[
                            styles.presetChipText,
                            { color: isMatch ? '#A855F7' : tc.text, fontWeight: isMatch ? '700' : '500' },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bottom Save & Reset Actions */}
        <View style={styles.bottomActions}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            style={[styles.primarySaveBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Save all notification preferences"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.primarySaveBtnText}>Save Preferences</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => void handleResetDefaults()}
            disabled={saving}
            style={[styles.resetBtn, { borderColor: tc.border, backgroundColor: tc.cardBg }]}
            accessibilityRole="button"
            accessibilityLabel="Reset notification preferences to defaults"
          >
            <Ionicons name="refresh-outline" size={16} color={tc.textMuted} />
            <Text style={[styles.resetBtnText, { color: tc.textMuted }]}>Reset to Defaults</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  headerSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    paddingBottom: 60,
    gap: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  digestRow: {
    flexDirection: 'row',
    gap: 8,
  },
  digestChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  digestChipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  digestChipSub: {
    fontSize: 9,
    textAlign: 'center',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
  },
  bottomActions: {
    marginTop: 8,
    gap: 12,
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
