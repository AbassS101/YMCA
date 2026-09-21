import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { YHeader } from '@/components/YHeader';
import { dialog } from '@/context/DialogContext';
import { useSession } from '@/context/SessionContext';
import { formatShortDate } from '@/domain/displayDates';
import type { Announcement, AnnouncementCategory, AnnouncementPriority } from '@/domain/types';
import { announcementRepo } from '@/repositories/announcementRepo';
import { cardStyle } from '@/theme/card';
import { colors } from '@/theme/colors';
import { radii, typography } from '@/theme/typography';

const BRANCH_ID = 'silver-spring';

export default function StaffAnnouncementsScreen() {
  const router = useRouter();
  const { session, api } = useSession();
  const staffId = session?.userId ?? '';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal State (Create or Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('facility');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [pinned, setPinned] = useState(false);
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const list = await announcementRepo.list(api, BRANCH_ID);
      setAnnouncements(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setCategory('facility');
    setPriority('normal');
    setPinned(false);
    setActionLabel('');
    setActionUrl('');
    setModalError(null);
    setModalVisible(true);
  }

  function openEdit(item: Announcement) {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setCategory(item.category);
    setPriority(item.priority);
    setPinned(Boolean(item.pinned));
    setActionLabel(item.actionLabel || '');
    setActionUrl(item.actionUrl || '');
    setModalError(null);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!title.trim() || !body.trim()) {
      setModalError('Title and message body are required.');
      return;
    }
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingId) {
        await announcementRepo.update(api, editingId, {
          title: title.trim(),
          body: body.trim(),
          category,
          priority,
          pinned,
          actionLabel: actionLabel.trim() || undefined,
          actionUrl: actionUrl.trim() || undefined,
        });
        dialog.alert('Updated!', 'Announcement details updated successfully.', [{ text: 'OK' }], 'checkmark');
      } else {
        const staff = await api.getStaff(staffId).catch(() => null);
        await announcementRepo.create(api, {
          branchId: BRANCH_ID,
          title: title.trim(),
          body: body.trim(),
          category,
          priority,
          pinned,
          authorName: staff ? `${staff.name} (${staff.roleLabel})` : 'YMCA Executive Staff',
          actionLabel: actionLabel.trim() || undefined,
          actionUrl: actionUrl.trim() || undefined,
        });
        dialog.alert(
          'Broadcasted!',
          'Announcement published and instant push alert dispatched to members.',
          [{ text: 'OK' }],
          'checkmark'
        );
      }
      setModalVisible(false);
      await load();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save announcement.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await announcementRepo.delete(api, id);
      dialog.alert('Deleted', 'Announcement removed from the branch notice board.', [{ text: 'OK' }], 'checkmark');
      await load();
    } catch {
      dialog.alert('Error', 'Could not delete announcement.', [{ text: 'OK' }]);
    }
  }

  async function handleTogglePin(item: Announcement) {
    try {
      await announcementRepo.update(api, item.id, { pinned: !item.pinned });
      await load();
    } catch {
      dialog.alert('Error', 'Failed to toggle pinned status.', [{ text: 'OK' }]);
    }
  }

  return (
    <View style={styles.screen}>
      <YHeader subtitle="Staff Admin · Announcements Manager" />
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        {/* Create Broadcast Button */}
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [
            styles.broadcastBannerBtn,
            pressed && { opacity: 0.9 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Broadcast Notice to All Members"
        >
          <View style={styles.broadcastIconWrap}>
            <Ionicons name="megaphone" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.broadcastBtnTitle}>+ Broadcast Notice to All Members</Text>
            <Text style={styles.broadcastBtnSubtitle}>Sends instant in-app notification & pins to home board</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.sectionTitle}>Current Notices & Bulletins ({announcements.length})</Text>

        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyText}>No active announcements found.</Text>
          </View>
        ) : (
          announcements.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            item.priority === 'urgent'
                              ? '#FEE2E2'
                              : item.priority === 'high'
                              ? '#FEF3C7'
                              : '#EFF6FF',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              item.priority === 'urgent'
                                ? colors.scarlet
                                : item.priority === 'high'
                                ? '#B45309'
                                : colors.primary,
                          },
                        ]}
                      >
                        {item.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.badgeText, { color: colors.nearBlack }]}>{item.category.toUpperCase()}</Text>
                    </View>
                    {item.pinned ? (
                      <View style={[styles.badge, { backgroundColor: '#FEF9C3' }]}>
                        <Text style={[styles.badgeText, { color: '#854D0E' }]}>📌 PINNED</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>
                    Posted by {item.authorName} · {formatShortDate(item.createdAt)}
                  </Text>
                </View>
              </View>

              <Text style={styles.bodyText}>{item.body}</Text>

              {item.actionLabel ? (
                <Text style={styles.actionLabelText}>Link: {item.actionLabel} ({item.actionUrl})</Text>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => openEdit(item)}
                  style={styles.actionBtnOutline}
                  accessibilityRole="button"
                >
                  <Ionicons name="pencil" size={15} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleTogglePin(item)}
                  style={styles.actionBtnOutline}
                  accessibilityRole="button"
                >
                  <Ionicons name="pin" size={15} color={item.pinned ? colors.scarlet : colors.nearBlack} />
                  <Text style={styles.actionBtnText}>{item.pinned ? 'Unpin' : 'Pin'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleDelete(item.id)}
                  style={styles.actionBtnDestructive}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash" size={15} color={colors.scarlet} />
                  <Text style={[styles.actionBtnText, { color: colors.scarlet }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ========================================== */}
      {/* MODAL: CREATE / EDIT ANNOUNCEMENT */}
      {/* ========================================== */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Announcement' : 'Broadcast New Announcement'}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.nearBlack} />
              </Pressable>
            </View>

            {modalError ? <ErrorBanner message={modalError} /> : null}

            <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              <TextField label="Announcement Title / Headline" value={title} onChangeText={setTitle} placeholder="e.g. Lap Pool Hours Extended" />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {(['facility', 'event', 'program', 'community'] as AnnouncementCategory[]).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[styles.miniChip, category === cat && styles.miniChipActive]}
                  >
                    <Text style={[styles.miniChipText, category === cat && styles.miniChipTextActive]}>
                      {cat.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Priority Level</Text>
              <View style={styles.chipRow}>
                {(['normal', 'high', 'urgent'] as AnnouncementPriority[]).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[styles.miniChip, priority === p && styles.miniChipActive]}
                  >
                    <Text style={[styles.miniChipText, priority === p && styles.miniChipTextActive]}>
                      {p.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextField
                label="Message Body"
                value={body}
                onChangeText={setBody}
                placeholder="Full details for YMCA members..."
                multiline
              />

              <TextField
                label="Action Button Label (Optional)"
                value={actionLabel}
                onChangeText={setActionLabel}
                placeholder="e.g. View Pool Hours, RSVP Now"
              />

              <TextField
                label="Action URL or Deep Link (Optional)"
                value={actionUrl}
                onChangeText={setActionUrl}
                placeholder="/(member)/schedule or external link"
              />

              <Pressable
                onPress={() => setPinned(!pinned)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
              >
                <Ionicons name={pinned ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.nearBlack }}>Pin to Top of Member Feed</Text>
              </Pressable>

              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title={editingId ? 'Save Changes' : 'Broadcast to Members'}
                  onPress={() => void handleSave()}
                  loading={submitting}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    gap: 14,
    paddingBottom: 40,
  },
  back: {
    ...typography.body,
    color: colors.scarlet,
    fontWeight: '700',
  },
  broadcastBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: radii.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  broadcastIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastBtnTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  broadcastBtnSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nearBlack,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    ...cardStyle,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 16,
    color: colors.nearBlack,
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  bodyText: {
    fontSize: 14,
    color: colors.nearBlack,
    lineHeight: 20,
    marginTop: 4,
  },
  actionLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 6,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  actionBtnDestructive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 20,
    ...cardStyle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.nearBlack,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  miniChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.nearBlack,
  },
  miniChipTextActive: {
    color: '#FFFFFF',
  },
});
