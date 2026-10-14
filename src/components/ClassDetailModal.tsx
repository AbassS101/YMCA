import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/context/ThemeContext';
import {
  getClassCatalogEntry,
  getClassFullDescription,
  getClassShortSummary,
  requiresAdvanceRegistration,
} from '@/domain/classCatalog';
import type { ScheduleItem } from '@/domain/types';
import { colors } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/typography';
import {
  downloadOrOpenIcs,
  openGoogleCalendar,
} from '@/utils/calendarExport';

export type ClassDetailModalProps = {
  visible: boolean;
  item: ScheduleItem | null;
  dayLabel: string;
  timeLabel: string;
  registered: boolean;
  spotsLeft: number;
  totalBooked: number;
  starred: boolean;
  busy?: boolean;
  onClose: () => void;
  onRegister: () => void;
  onChange?: () => void;
  onCancel?: () => void;
  onToggleStar?: () => void;
  onOpenForum?: () => void;
};

function formatDuration(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    const mins = Math.round((e - s) / 60000);
    if (mins > 0) return `${mins} min`;
  } catch {
    // fallback
  }
  return '60 min';
}

function getLocationDetails(location: string): { title: string; directions: string; icon: any } {
  const loc = location.toLowerCase();
  if (loc.includes('pool')) {
    return {
      title: 'Indoor Aquatics Center (25m Pool)',
      directions: 'Lower Level 1 · Please rinse off before entering pool deck. Swim cap and appropriate swimwear required. Flotation belts provided for deep water classes.',
      icon: 'water-outline',
    };
  }
  if (loc.includes('free weight') || loc.includes('weight')) {
    return {
      title: 'Free Weight Studio 2',
      directions: 'Main Level 1 · Dedicated strength studio with Olympic barbells, kettlebells, and adjustable benches. Clean athletic shoes and sweat towel required.',
      icon: 'barbell-outline',
    };
  }
  if (loc.includes('circuit') || loc.includes('studio/circuit')) {
    return {
      title: 'Studio & Circuit Room',
      directions: 'Level 2 Wellness Wing · Functional training room equipped with TRX suspension, plyo boxes, and circuit stations. Check in with trainer upon arrival.',
      icon: 'fitness-outline',
    };
  }
  if (loc.includes('studio')) {
    return {
      title: 'Mind-Body Studio B',
      directions: 'Level 2 · Quiet hardwood studio with climate control. Yoga mats, yoga blocks, bolsters, and straps provided. Remove outdoor footwear at studio entrance.',
      icon: 'sparkles-outline',
    };
  }
  return {
    title: 'Main Gymnasium',
    directions: 'Level 1 North Wing · Full-size gymnasium court. Arrive 5 minutes prior to class time to pick up your equipment. Sweat towel and water bottle recommended.',
    icon: 'basketball-outline',
  };
}

function getEquipmentDetails(title: string, category: string): { provided: string; bring: string } {
  const t = title.toLowerCase();
  if (t.includes('water') || t.includes('aqua')) {
    return {
      provided: 'YMCA buoyancy belts, water dumbbells, kickboards, and resistance noodles.',
      bring: 'Swimwear, goggles, swim cap, towel, and clean pool deck footwear / flip flops.',
    };
  }
  if (t.includes('yoga') || t.includes('pilates') || t.includes('tai chi') || t.includes('qigong') || t.includes('barre') || t.includes('bodybalance')) {
    return {
      provided: 'YMCA studio yoga mats, foam blocks, stretch straps, and bolsters.',
      bring: 'Comfortable stretch attire, personal yoga mat (optional), and water bottle.',
    };
  }
  if (t.includes('bodypump') || t.includes('iron') || t.includes('strength') || t.includes('burn')) {
    return {
      provided: 'SMARTBAR® barbells, weight plates (2.5lb, 5lb, 10lb), bench steps, and resistance bands.',
      bring: 'Athletic cross-trainers or running shoes, workout towel, and hydration drink.',
    };
  }
  if (t.includes('cycle') || t.includes('spin') || t.includes('pedaling')) {
    return {
      provided: 'Stages indoor cycling bikes with SPD clip pedals and athletic shoe cages.',
      bring: 'Cycling shoes or stiff-soled sneakers, workout towel, and water bottle.',
    };
  }
  return {
    provided: 'All resistance tubing, dumbbells, steps, and core conditioning gear provided by YMCA.',
    bring: 'Athletic sneakers, sweat towel, and full water bottle.',
  };
}

export function ClassDetailModal({
  visible,
  item,
  dayLabel,
  timeLabel,
  registered,
  spotsLeft,
  totalBooked,
  starred,
  busy,
  onClose,
  onRegister,
  onChange,
  onCancel,
  onToggleStar,
  onOpenForum,
}: ClassDetailModalProps) {
  const { colors: tc, isDark } = useTheme();
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    setCalendarAdded(false);
  }, [item?.id, visible]);

  const durationStr = useMemo(() => {
    if (!item) return '60 min';
    return formatDuration(item.start, item.end);
  }, [item]);

  const locInfo = useMemo(() => {
    if (!item) return { title: 'Gym', directions: '', icon: 'fitness-outline' };
    return getLocationDetails(item.location);
  }, [item]);

  const equipInfo = useMemo(() => {
    if (!item) return { provided: '', bring: '' };
    return getEquipmentDetails(item.title, item.category);
  }, [item]);

  const catalogEntry = useMemo(() => {
    if (!item) return undefined;
    return getClassCatalogEntry(item.title);
  }, [item]);

  if (!item) return null;

  const isPaid = (item.priceCents ?? 0) > 0;
  const needsRegistration = requiresAdvanceRegistration(item);
  const isRegistered = Boolean(registered && needsRegistration);
  const priceDisplay = isPaid ? `$${((item.priceCents ?? 0) / 100).toFixed(2)}` : 'Free with Membership';
  const isFull = spotsLeft <= 0 && !isRegistered;
  const fullDescription = getClassFullDescription(item);
  const shortSummary = getClassShortSummary(item);

  const calendarEvent = {
    title: item.title,
    startIso: item.start,
    endIso: item.end,
    location: item.location,
    description: fullDescription,
    instructorName: item.instructorName,
  };

  const handleAddToCalendar = () => {
    setCalendarAdded(true);
    if (!starred && onToggleStar) {
      onToggleStar();
    }
    void downloadOrOpenIcs(calendarEvent);
  };

  const handleOpenGoogleCalendar = () => {
    setCalendarAdded(true);
    if (!starred && onToggleStar) {
      onToggleStar();
    }
    void openGoogleCalendar(calendarEvent);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: tc.border }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.topBadgeRow}>
                <View style={[styles.sessionBadge, { backgroundColor: tc.primaryLight }]}>
                  <Text style={[styles.sessionBadgeText, { color: tc.primary }]}>
                    {catalogEntry ? `${catalogEntry.section.toUpperCase()} · ` : ''}FALL 1 SCHEDULE
                  </Text>
                </View>
                {item.registrationRequired ? (
                  <View style={[styles.regReqBadge, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                    <Text style={[styles.regReqBadgeText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                      REGISTRATION REQUIRED
                    </Text>
                  </View>
                ) : !needsRegistration ? (
                  <View style={[styles.regReqBadge, { backgroundColor: isDark ? '#1E293B' : '#E0F2FE' }]}>
                    <Text style={[styles.regReqBadgeText, { color: tc.primary }]}>
                      DROP-IN · NO REG NEEDED
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.modalTitle, { color: tc.text }]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[styles.closeHit, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              accessibilityRole="button"
              accessibilityLabel="Close details modal"
            >
              <Ionicons name="close" size={20} color={tc.text} />
            </Pressable>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {/* Quick Metadata Bar */}
            <View style={[styles.metaBar, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: tc.border }]}>
              <View style={styles.metaCell}>
                <Ionicons name="time-outline" size={18} color={tc.primary} />
                <View>
                  <Text style={[styles.metaLabel, { color: tc.textMuted }]}>TIME & DURATION</Text>
                  <Text style={[styles.metaValue, { color: tc.text }]}>
                    {timeLabel} ({durationStr})
                  </Text>
                </View>
              </View>

              <View style={[styles.metaDivider, { backgroundColor: tc.border }]} />

              <View style={styles.metaCell}>
                <Ionicons name="calendar-outline" size={18} color={tc.primary} />
                <View>
                  <Text style={[styles.metaLabel, { color: tc.textMuted }]}>DAY</Text>
                  <Text style={[styles.metaValue, { color: tc.text }]}>{dayLabel}</Text>
                </View>
              </View>
            </View>

            {/* Registration Callout vs Drop-In Star Reminder Callout */}
            {item.registrationRequired ? (
              <View
                style={[
                  styles.calloutCard,
                  {
                    backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                    borderColor: isDark ? '#B45309' : '#FCD34D',
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={22} color="#D97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.calloutTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                    Advance Registration Required
                  </Text>
                  <Text style={[styles.calloutBody, { color: isDark ? '#FCD34D' : '#78350F' }]}>
                    This program has capped capacity to ensure proper instructor supervision and equipment availability. Please reserve your spot below.
                  </Text>
                </View>
              </View>
            ) : !needsRegistration ? (
              <View
                style={[
                  styles.calloutCard,
                  {
                    backgroundColor: starred
                      ? isDark
                        ? '#422006'
                        : '#FFFBEB'
                      : isDark
                      ? '#0F233A'
                      : '#F0F9FF',
                    borderColor: starred
                      ? '#F59E0B'
                      : isDark
                      ? '#1E3A8A'
                      : '#BAE6FD',
                  },
                ]}
              >
                <Ionicons
                  name={starred ? 'notifications' : 'star-outline'}
                  size={22}
                  color={starred ? '#D97706' : tc.primary}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={[
                      styles.calloutTitle,
                      { color: starred ? (isDark ? '#FDE68A' : '#92400E') : tc.text },
                    ]}
                  >
                    {starred
                      ? 'Starred · Notification Reminder Active'
                      : 'No Registration Needed · Star for Class Reminder'}
                  </Text>
                  <Text
                    style={[
                      styles.calloutBody,
                      { color: starred ? (isDark ? '#FCD34D' : '#78350F') : tc.textMuted },
                    ]}
                  >
                    {starred
                      ? `You've starred ${item.title}! We will notify you when this class is happening—just show up and enjoy.`
                      : 'This is a drop-in class included with your membership. No need to register—just star it to get notified when it is happening!'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Key Badges Strip */}
            <View style={styles.badgeRow}>
              {isPaid ? (
                <View style={[styles.pill, { backgroundColor: tc.paidBadgeBg, borderColor: tc.border }]}>
                  <Ionicons name="pricetag-outline" size={13} color={tc.paidBadge} />
                  <Text style={[styles.pillText, { color: tc.paidBadge }]}>Extra Cost · {priceDisplay}</Text>
                </View>
              ) : (
                <View style={[styles.pill, { backgroundColor: tc.successBg, borderColor: '#A7F3D0' }]}>
                  <Ionicons name="checkmark-circle-outline" size={13} color={tc.success} />
                  <Text style={[styles.pillText, { color: tc.success }]}>Included with Membership ($0.00)</Text>
                </View>
              )}

              {item.seniorFriendly ? (
                <View style={[styles.pill, { backgroundColor: tc.primaryLight, borderColor: tc.border }]}>
                  <Ionicons name="heart-outline" size={13} color={tc.primary} />
                  <Text style={[styles.pillText, { color: tc.primary }]}>Active Older Adults / Senior Friendly</Text>
                </View>
              ) : null}

              {item.intensity ? (
                <View style={[styles.pill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border }]}>
                  <Ionicons name="speedometer-outline" size={13} color={tc.textMuted} />
                  <Text style={[styles.pillText, { color: tc.text }]}>Intensity: {item.intensity}</Text>
                </View>
              ) : null}
            </View>

            {/* Official YMCA Class Description */}
            <View style={styles.contentBlock}>
              <Text style={[styles.blockHeading, { color: tc.text }]}>Class Description</Text>
              {shortSummary && shortSummary !== fullDescription ? (
                <Text style={[styles.summaryLead, { color: tc.primary }]}>
                  {shortSummary}
                </Text>
              ) : null}
              <Text style={[styles.bodyText, { color: tc.text }]}>
                {fullDescription}
              </Text>
            </View>

            {/* Instructor & Location Section */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: tc.border }]}>
              {/* Instructor */}
              <View style={styles.infoRow}>
                <View style={[styles.avatarCircle, { backgroundColor: tc.primary }]}>
                  <Text style={styles.avatarInitial}>
                    {item.instructorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionSubtitle, { color: tc.textMuted }]}>INSTRUCTOR</Text>
                  <Text style={[styles.instructorName, { color: tc.text }]}>
                    {item.instructorName}
                  </Text>
                  <Text style={[styles.instructorDesc, { color: tc.textMuted }]}>
                    YMCA Certified Group Fitness Specialist
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: tc.border }]} />

              {/* Location */}
              <View style={styles.infoRow}>
                <View style={[styles.locIconWrap, { backgroundColor: tc.primaryLight }]}>
                  <Ionicons name={locInfo.icon} size={22} color={tc.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.sectionSubtitle, { color: tc.textMuted }]}>LOCATION & ROOM</Text>
                  <Text style={[styles.roomTitle, { color: tc.text }]}>
                    {item.location} · {locInfo.title}
                  </Text>
                  <Text style={[styles.roomDirections, { color: tc.textMuted }]}>
                    {locInfo.directions}
                  </Text>
                </View>
              </View>
            </View>

            {/* What to Bring & Provided */}
            <View style={[styles.equipCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: tc.border }]}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-done" size={16} color={tc.success} />
                  <Text style={[styles.equipSubHeading, { color: tc.text }]}>Provided by YMCA:</Text>
                </View>
                <Text style={[styles.equipText, { color: tc.textMuted }]}>{equipInfo.provided}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: tc.border }]} />

              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="bag-check-outline" size={16} color={tc.primary} />
                  <Text style={[styles.equipSubHeading, { color: tc.text }]}>What to Bring:</Text>
                </View>
                <Text style={[styles.equipText, { color: tc.textMuted }]}>{equipInfo.bring}</Text>
              </View>
            </View>

            {/* Capacity Status Gauge (Shown when registration is required) */}
            {needsRegistration ? (
              <View style={[styles.capacityCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: tc.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.capacityTitle, { color: tc.text }]}>Class Capacity</Text>
                  <Text
                    style={[
                      styles.capacityCount,
                      {
                        color: isFull
                          ? tc.danger
                          : spotsLeft <= 3
                          ? tc.gold
                          : tc.success,
                      },
                    ]}
                  >
                    {isFull
                      ? 'Session is Full'
                      : `${spotsLeft} of ${item.capacity} spots open`}
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, Math.max(8, (totalBooked / Math.max(1, item.capacity)) * 100))}%`,
                        backgroundColor: isFull
                          ? tc.danger
                          : spotsLeft <= 3
                          ? tc.gold
                          : tc.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.capacityHelp, { color: tc.textMuted }]}>
                  {totalBooked} members currently enrolled in this session
                </Text>
              </View>
            ) : null}

            {/* Quick Action Tools Row: Star/Reminder, Add to Calendar, Forum */}
            <View style={styles.toolRow}>
              {onToggleStar ? (
                <Pressable
                  onPress={onToggleStar}
                  style={[
                    styles.toolBtn,
                    { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={starred ? 'Remove star reminder' : 'Star for reminder'}
                >
                  <Ionicons
                    name={starred ? 'star' : 'star-outline'}
                    size={16}
                    color={starred ? colors.gold : tc.text}
                  />
                  <Text style={[styles.toolBtnText, { color: tc.text }]}>
                    {starred ? 'Starred' : 'Star Class'}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={handleAddToCalendar}
                style={[
                  styles.toolBtn,
                  calendarAdded
                    ? {
                        backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                        borderColor: '#10B981',
                      }
                    : {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: tc.border,
                      },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add session to personal calendar"
              >
                <Ionicons
                  name={calendarAdded ? 'checkmark-circle' : 'calendar'}
                  size={16}
                  color={calendarAdded ? '#10B981' : tc.primary}
                />
                <Text
                  style={[
                    styles.toolBtnText,
                    { color: calendarAdded ? (isDark ? '#6EE7B7' : '#047857') : tc.text },
                  ]}
                >
                  {calendarAdded ? 'In Calendar' : 'Add Calendar'}
                </Text>
              </Pressable>

              {onOpenForum ? (
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenForum();
                  }}
                  style={[
                    styles.toolBtn,
                    { backgroundColor: isDark ? '#1E1B4B' : '#FAF5FF', borderColor: '#C084FC' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Open class community forum"
                >
                  <Ionicons name="chatbubbles" size={16} color="#7C3AED" />
                  <Text style={[styles.toolBtnText, { color: '#7C3AED' }]}>Class Chat</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Inline Calendar Sync Confirmation & Export Drawer */}
            {calendarAdded ? (
              <View
                style={[
                  styles.calendarConfirmCard,
                  {
                    backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
                    borderColor: isDark ? '#059669' : '#86EFAC',
                  },
                ]}
              >
                <View style={styles.calendarConfirmHeader}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.calendarConfirmTitle,
                        { color: isDark ? '#A7F3D0' : '#14532D' },
                      ]}
                    >
                      Synced to Your YMCA Schedule & Calendar!
                    </Text>
                    <Text
                      style={[
                        styles.calendarConfirmSub,
                        { color: isDark ? '#D1FAE5' : '#166534' },
                      ]}
                    >
                      {item.title} ({dayLabel} · {timeLabel}) has been starred for reminders and exported as an .ICS calendar invite.
                    </Text>
                  </View>
                </View>

                <View style={styles.calendarExportBtnRow}>
                  <Pressable
                    onPress={() => void downloadOrOpenIcs(calendarEvent)}
                    style={[
                      styles.calendarExportBtn,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                        borderColor: isDark ? '#10B981' : '#86EFAC',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Download ICS Calendar File for Apple or Outlook"
                  >
                    <Ionicons name="download-outline" size={14} color="#059669" />
                    <Text style={[styles.calendarExportBtnText, { color: '#059669' }]}>
                      Download .ICS (Apple / Outlook)
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleOpenGoogleCalendar}
                    style={[
                      styles.calendarExportBtn,
                      {
                        backgroundColor: tc.primary,
                        borderColor: tc.primary,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Open in Google Calendar"
                  >
                    <Ionicons name="logo-google" size={13} color="#FFFFFF" />
                    <Text style={[styles.calendarExportBtnText, { color: '#FFFFFF' }]}>
                      Google Calendar ↗
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Fixed Footer: Register CTA ONLY for Reg-Required Classes */}
          {needsRegistration ? (
            <View style={[styles.footer, { borderTopColor: tc.border, backgroundColor: tc.cardBg }]}>
              {isRegistered ? (
                <View style={{ gap: 8 }}>
                  <View style={[styles.registeredBanner, { backgroundColor: tc.successBg, borderColor: '#A7F3D0' }]}>
                    <Ionicons name="checkmark-circle" size={18} color={tc.success} />
                    <Text style={[styles.registeredBannerText, { color: tc.success }]}>
                      You are registered for this class
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {onChange ? (
                      <View style={{ flex: 1 }}>
                        <SecondaryButton
                          title="Change Time"
                          onPress={() => {
                            onClose();
                            onChange();
                          }}
                          disabled={busy}
                        />
                      </View>
                    ) : null}
                    {onCancel ? (
                      <View style={{ flex: 1 }}>
                        <SecondaryButton
                          title="Cancel Spot"
                          destructive
                          onPress={() => {
                            onClose();
                            onCancel();
                          }}
                          disabled={busy}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                <PrimaryButton
                  title={
                    isFull
                      ? 'Session is Full'
                      : isPaid
                      ? `Book & Pay ${priceDisplay}`
                      : 'Reserve My Spot (Free)'
                  }
                  onPress={() => {
                    onClose();
                    onRegister();
                  }}
                  disabled={isFull || busy}
                  loading={busy}
                />
              )}
            </View>
          ) : (
            <View style={[styles.footer, { borderTopColor: tc.border, backgroundColor: tc.cardBg }]}>
              <View style={styles.dropInFooterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropInFooterTitle, { color: tc.text }]}>
                    Drop-In Session · No Registration Required
                  </Text>
                  <Text style={[styles.dropInFooterSub, { color: tc.textMuted }]}>
                    Included with membership — simply arrive 5 minutes early.
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={[styles.doneCloseBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: tc.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Close class details"
                >
                  <Text style={[styles.doneCloseBtnText, { color: tc.text }]}>Done</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    minHeight: '65%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  regReqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regReqBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeHit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 16,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  metaCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  calloutBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '800',
  },
  instructorDesc: {
    fontSize: 12,
  },
  locIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  roomDirections: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  contentBlock: {
    gap: 6,
  },
  blockHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  summaryLead: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
  },
  equipCard: {
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 12,
  },
  equipSubHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
  equipText: {
    fontSize: 12,
    lineHeight: 17,
  },
  capacityCard: {
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 8,
  },
  capacityTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  capacityCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityHelp: {
    fontSize: 11,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
  registeredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  registeredBannerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  calendarConfirmCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  calendarConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  calendarConfirmTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  calendarConfirmSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  calendarExportBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  calendarExportBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dropInFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropInFooterTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  dropInFooterSub: {
    fontSize: 11,
    marginTop: 2,
  },
  doneCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});

