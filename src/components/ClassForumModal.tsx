import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChatView } from '@/components/chat/ChatView';
import { classSource } from '@/components/chat/chatSources';
import { useChatTheme } from '@/components/chat/chatTheme';
import { isStaffRole, type ChatIdentity } from '@/components/chat/chatTypes';
import { useSession } from '@/context/SessionContext';
import { isAdminRole, type ScheduleItem, type Staff } from '@/domain/types';
import { scheduleRepo } from '@/repositories/scheduleRepo';
import {
  CLASS_CATEGORY_LABEL,
  classChatKey,
  weekdaysLabel,
} from '@/domain/classChats';

function formatClassTime(isoStr?: string): string {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export type ClassForumModalProps = {
  visible: boolean;
  onClose: () => void;
  scheduleItem: ScheduleItem | null;
  onPostCreated?: (classId: string) => void;
  isInterested?: boolean;
  onToggleInterested?: (classId: string) => void;
};

export function ClassForumModal({
  visible,
  onClose,
  scheduleItem,
  onPostCreated,
  isInterested = false,
  onToggleInterested,
}: ClassForumModalProps) {
  const router = useRouter();
  const { session, api } = useSession();
  const theme = useChatTheme();
  const insets = useSafeAreaInsets();

  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberAvatar, setMemberAvatar] = useState<string | undefined>();

  const currentUserId = session?.userId ?? '';
  const currentUserRole = session?.role ?? 'member';

  useEffect(() => {
    if (!visible || !api || !currentUserId) return;
    void (async () => {
      try {
        if (currentUserRole === 'member') {
          const m = await api.getMember(currentUserId);
          setMemberName(m.name);
          setMemberAvatar(m.avatarUrl);
        } else {
          setStaffProfile(await api.getStaff(currentUserId));
        }
      } catch {
        // fallback names
      }
    })();
  }, [api, currentUserId, currentUserRole, visible]);

  const isOverallAdmin = isAdminRole(currentUserRole);
  const isClassTrainer = Boolean(
    (currentUserRole === 'trainer' || currentUserRole === 'swim_instructor' || currentUserRole === 'wellness_director') &&
      scheduleItem &&
      (scheduleItem.staffId === currentUserId ||
        (staffProfile?.name &&
          (scheduleItem.instructorName.toLowerCase().includes(staffProfile.name.toLowerCase()) ||
            staffProfile.name.toLowerCase().includes(scheduleItem.instructorName.toLowerCase()))))
  );
  const isClassManager = isOverallAdmin || isClassTrainer;

  const me = useMemo<ChatIdentity>(
    () => ({
      userId: currentUserId,
      name:
        currentUserRole !== 'member' && staffProfile ? staffProfile.name : memberName || 'YMCA Member',
      role: currentUserRole,
      avatarUrl: currentUserRole !== 'member' ? staffProfile?.avatarUrl : memberAvatar,
      isStaff: isStaffRole(String(currentUserRole)),
    }),
    [currentUserId, currentUserRole, staffProfile, memberName, memberAvatar]
  );

  // One chat per class: gather every session of this class so the thread is shared.
  const [siblings, setSiblings] = useState<ScheduleItem[]>([]);
  useEffect(() => {
    if (!visible || !api || !scheduleItem) return;
    let cancelled = false;
    const key = classChatKey(scheduleItem);
    void scheduleRepo
      .listAll(api, scheduleItem.branchId)
      .then((all) => {
        if (!cancelled) setSiblings(all.filter((s) => classChatKey(s) === key));
      })
      .catch(() => {
        if (!cancelled) setSiblings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [api, visible, scheduleItem]);

  const classIds = useMemo(() => {
    if (!scheduleItem) return [];
    const ids = new Set(siblings.map((s) => s.id));
    ids.add(scheduleItem.id);
    return [...ids].sort();
  }, [siblings, scheduleItem]);

  const scheduleLabel = useMemo(() => {
    const days = weekdaysLabel(
      Array.from(new Set(siblings.map((s) => new Date(s.start).getDay()))).sort((a, b) => a - b)
    );
    return days || '';
  }, [siblings]);

  const source = useMemo(
    () => (api && scheduleItem ? classSource(api, scheduleItem, me, classIds) : null),
    [api, scheduleItem, me, classIds]
  );

  if (!scheduleItem) return null;

  const subtitle = isClassManager
    ? 'You moderate this chat: pin announcements, remove messages.'
    : `${CLASS_CATEGORY_LABEL[scheduleItem.category]} · all sessions · Moderated by ${scheduleItem.instructorName}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingLeft: Math.max(14, insets.left),
              paddingRight: Math.max(10, insets.right),
            },
          ]}
        >
          <View style={styles.hash}>
            <Ionicons name="chatbubbles" size={18} color={theme.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {scheduleItem.title}
            </Text>
            <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
              {scheduleItem.instructorName}
              {scheduleLabel ? ` · ${scheduleLabel}` : ''} · {formatClassTime(scheduleItem.start)} -{' '}
              {formatClassTime(scheduleItem.end)}
            </Text>
          </View>
          {onToggleInterested ? (
            <Pressable
              onPress={() => onToggleInterested(scheduleItem.id)}
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isInterested ? 'Unstar class chat' : 'Star class chat'}
            >
              <Ionicons
                name={isInterested ? 'star' : 'star-outline'}
                size={20}
                color={isInterested ? '#D97706' : theme.muted}
              />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close class chat">
            <Ionicons name="close" size={24} color={theme.muted} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            onClose();
            router.push('/(member)/community-forum');
          }}
          style={[styles.subline, { backgroundColor: theme.input }]}
          accessibilityRole="button"
          accessibilityLabel="Open general community forum"
        >
          <Ionicons name={isClassManager ? 'shield-checkmark' : 'people'} size={13} color={theme.muted} />
          <Text style={[styles.sublineText, { color: theme.muted }]} numberOfLines={1}>
            {subtitle} ·{' '}
            <Text style={{ color: theme.accent, fontWeight: '800' }}>General forum ›</Text>
          </Text>
        </Pressable>

        <ChatView
          source={source}
          me={me}
          enabled={visible}
          placeholder={
            isClassManager
              ? `Message #${scheduleItem.title} as instructor`
              : `Message #${scheduleItem.title} (@ to tag)`
          }
          maxLength={500}
          emptyTitle="No messages yet"
          emptySubtitle="Say hello, ask the instructor a question, or coordinate with classmates."
          canDelete={(m) => m.authorId === currentUserId || isClassManager}
          deleteLabel={(m) =>
            m.authorId === currentUserId
              ? 'Delete your message'
              : isClassTrainer
                ? 'Delete (class instructor)'
                : 'Delete (administrator)'
          }
          canPin={isClassManager}
          onSent={() => onPostCreated?.(scheduleItem.id)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hash: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 1 },
  iconBtn: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  subline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6 },
  sublineText: { flex: 1, fontSize: 11 },
});
