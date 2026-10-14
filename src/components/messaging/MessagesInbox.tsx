import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/UserAvatar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { YHeader } from '@/components/YHeader';
import { roleTag } from '@/components/chat/ChatMessageRow';
import { useChatTheme } from '@/components/chat/chatTheme';
import { excerptOf } from '@/components/chat/chatTypes';
import { useSession } from '@/context/SessionContext';
import type { Message, Thread } from '@/domain/types';
import { messageRepo } from '@/repositories/messageRepo';
import { resolvePerson } from './resolvePerson';

type Person = {
  id: string;
  name: string;
  subtitle: string;
  avatarUrl?: string;
  isStaff: boolean;
  role: string;
};

type Row = { thread: Thread; other: Person; last: Message | null };

type Props = {
  /** Which app is rendering the inbox. */
  mode: 'staff' | 'member';
  /** Route prefix used to open a conversation, e.g. `/(staff)/messages`. */
  threadBase: string;
  /** Optional extra content above the list (e.g. the forum shortcut). */
  header?: React.ReactElement | null;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function MessagesInbox({ mode, threadBase, header }: Props) {
  const router = useRouter();
  const theme = useChatTheme();
  const insets = useSafeAreaInsets();
  const { session, api } = useSession();
  const myId = session?.userId ?? '';
  const iAmStaff = mode === 'staff';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!myId) return;
    try {
      setError(false);
      const threads = await messageRepo.listThreads(api, myId);
      const built = await Promise.all(
        threads.map(async (thread): Promise<Row | null> => {
          try {
            const [msgs, other] = await Promise.all([
              messageRepo.listMessages(api, thread.id),
              resolvePerson(api, thread.memberId === myId ? thread.staffId : thread.memberId).then(
                (p): Person => ({ ...p })
              ),
            ]);
            const last =
              [...msgs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
            return { thread, other, last };
          } catch {
            return null;
          }
        })
      );
      const list = built.filter((r): r is Row => r !== null);
      list.sort((a, b) => {
        if (a.last && b.last) return b.last.createdAt.localeCompare(a.last.createdAt);
        if (a.last) return -1;
        if (b.last) return 1;
        return a.other.name.localeCompare(b.other.name);
      });
      setRows(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, myId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(member)/(tabs)/home' as never);
  };

  const openPicker = async () => {
    setQuery('');
    setPickerOpen(true);
    setPeopleLoading(true);
    try {
      if (iAmStaff) {
        const [members, staff] = await Promise.all([api.listAllMembers(), api.listStaff()]);
        setPeople([
          ...staff.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: s.roleLabel,
            avatarUrl: s.avatarUrl,
            isStaff: true,
            role: s.staffRole ?? 'staff',
          })),
          ...members.map((m) => ({
            id: m.id,
            name: m.name,
            subtitle: m.email,
            avatarUrl: m.avatarUrl,
            isStaff: false,
            role: 'member',
          })),
        ]);
      } else {
        const staff = await api.listStaff();
        setPeople(
          staff.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: s.roleLabel,
            avatarUrl: s.avatarUrl,
            isStaff: true,
            role: s.staffRole ?? 'staff',
          }))
        );
      }
    } catch {
      setPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  };

  const startWith = async (person: Person) => {
    if (!myId || starting) return;
    setStarting(person.id);
    try {
      // Threads store the non-staff side as memberId; for staff-to-staff the other person fills it.
      const thread = await messageRepo.getOrCreateThread(
        api,
        iAmStaff ? person.id : myId,
        iAmStaff ? myId : person.id
      );
      setPickerOpen(false);
      router.push(`${threadBase}/${thread.id}` as never);
    } finally {
      setStarting(null);
    }
  };

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = people.filter((p) => p.id !== myId);
    if (!q) return list;
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    );
  }, [people, query, myId]);

  const renderRow = ({ item }: { item: Row }) => {
    const { thread, other, last } = item;
    const tag = other.isStaff ? roleTag(other.role) ?? { label: 'STAFF', color: '#0284C7' } : null;
    const fromMe = last?.fromId === myId;
    const preview = last
      ? `${fromMe ? 'You: ' : ''}${excerptOf(last.body, 80)}`
      : iAmStaff
        ? 'Start the conversation'
        : 'No messages yet';
    return (
      <Pressable
        onPress={() => router.push(`${threadBase}/${thread.id}` as never)}
        style={({ pressed }) => [
          styles.row,
          { borderBottomColor: theme.border, backgroundColor: pressed ? theme.hover : 'transparent' },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${other.name}. ${preview}`}
      >
        <UserAvatar uri={other.avatarUrl} name={other.name} size={46} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <View style={styles.nameLine}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {other.name}
              </Text>
              {tag ? (
                <View style={[styles.tag, { backgroundColor: tag.color }]}>
                  <Text style={styles.tagText}>{tag.label}</Text>
                </View>
              ) : null}
            </View>
            {last ? (
              <Text style={[styles.time, { color: theme.muted }]}>{formatWhen(last.createdAt)}</Text>
            ) : null}
          </View>
          <Text style={[styles.sub, { color: theme.muted }]} numberOfLines={1}>
            {other.subtitle}
          </Text>
          <Text
            style={[styles.preview, { color: last && !fromMe ? theme.text : theme.muted }]}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.muted} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <YHeader subtitle="Messages" />
      {!iAmStaff ? (
        <View style={[styles.backBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            onPress={goBack}
            hitSlop={8}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={21} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <ErrorBanner onRetry={() => void load()} /> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.thread.id}
        renderItem={renderRow}
        ListHeaderComponent={
          <View>
            {header}
            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: theme.muted }]}>
                {iAmStaff ? 'CONVERSATIONS' : 'CONVERSATIONS WITH YMCA STAFF'}
              </Text>
              <Pressable
                onPress={() => void openPicker()}
                style={[styles.newBtn, { backgroundColor: theme.accent }]}
                accessibilityRole="button"
                accessibilityLabel={iAmStaff ? 'New message' : 'Message staff'}
              >
                <Ionicons name="create-outline" size={15} color="#FFFFFF" />
                <Text style={styles.newBtnText}>{iAmStaff ? 'New message' : 'Message staff'}</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={theme.accent} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No conversations yet</Text>
              <Text style={[styles.emptySub, { color: theme.muted }]}>
                {iAmStaff
                  ? 'Tap "New message" to reach out to a member or another staff member.'
                  : 'Tap "Message staff" to ask a trainer or the front desk a question.'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
      />

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.cancel, { color: theme.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {iAmStaff ? 'New message' : 'Message staff'}
            </Text>
            <View style={{ width: 52 }} />
          </View>
          <View style={[styles.searchWrap, { backgroundColor: theme.input }]}>
            <Ionicons name="search" size={16} color={theme.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={iAmStaff ? 'Search members or staff by name, role, or email' : 'Search staff by name or role'}
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search people"
            />
          </View>
          {peopleLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={theme.accent} />
          ) : (
            <FlatList
              data={filteredPeople}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.emptySub, { color: theme.muted, marginTop: 32 }]}>
                  No one found.
                </Text>
              }
              renderItem={({ item }) => {
                const tag = item.isStaff
                  ? roleTag(item.role) ?? { label: 'STAFF', color: '#0284C7' }
                  : null;
                return (
                  <Pressable
                    onPress={() => void startWith(item)}
                    disabled={Boolean(starting)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderBottomColor: theme.border,
                        backgroundColor: pressed ? theme.hover : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${item.name}`}
                  >
                    <UserAvatar uri={item.avatarUrl} name={item.name} size={42} />
                    <View style={styles.rowBody}>
                      <View style={styles.nameLine}>
                        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {tag ? (
                          <View style={[styles.tag, { backgroundColor: tag.color }]}>
                            <Text style={styles.tagText}>{tag.label}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.sub, { color: theme.muted }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                    {starting === item.id ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <Ionicons name="chatbubble-outline" size={18} color={theme.accent} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 4 },
  backText: { fontSize: 15, fontWeight: '700' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, flexShrink: 1 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  newBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, gap: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  name: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  tag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  time: { fontSize: 11 },
  sub: { fontSize: 12 },
  preview: { fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', gap: 8, padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  modal: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { fontSize: 15, fontWeight: '600' },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
});
