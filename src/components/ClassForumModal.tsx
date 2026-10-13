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

function formatClassDate(isoStr?: string): string {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

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
    (currentUserRole === 'trainer' || currentUserRole === 'wellness_director') &&
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

  const source = useMemo(
    () => (api && scheduleItem ? classSource(api, scheduleItem, me) : null),
    [api, scheduleItem, me]
  );

  if (!scheduleItem) return null;

  const subtitle = isClassManager
    ? 'You moderate this chat: pin announcements, remove messages.'
    : `Moderated by ${scheduleItem.instructorName} & YMCA IT`;

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
              {scheduleItem.instructorName} · {formatClassDate(scheduleItem.start)} ·{' '}
              {formatClassTime(scheduleItem.start)} - {formatClassTime(scheduleItem.end)}
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
