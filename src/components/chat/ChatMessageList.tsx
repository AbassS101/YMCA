import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { AppText as Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { filterProfanity } from '@/domain/types';
import { ChatMessageRow } from './ChatMessageRow';
import type { ChatTheme } from './chatTheme';
import type { ChatMessage } from './chatTypes';

type Entry =
  | { kind: 'message'; key: string; message: ChatMessage; showHeader: boolean }
  | { kind: 'divider'; key: string; label: string };

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export function buildEntries(messages: ChatMessage[], newestFirst = true): Entry[] {
  const sorted = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const out: Entry[] = [];
  let prev: ChatMessage | null = null;
  for (const m of sorted) {
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
    if (newDay) out.push({ kind: 'divider', key: `div-${dayKey(m.createdAt)}`, label: dayLabel(m.createdAt) });
    const grouped =
      !newDay &&
      prev &&
      prev.authorId === m.authorId &&
      !m.replyTo &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
    out.push({ kind: 'message', key: m.id, message: m, showHeader: !grouped });
    prev = m;
  }
  return newestFirst ? out.reverse() : out; // inverted chat: newest first; thread: oldest first
}

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  theme: ChatTheme;
  meId: string;
  header?: React.ReactElement | null;
  /** 'chat' opens at the newest message; 'thread' opens at the top (header/OP first), replies oldest to newest. */
  layout?: 'chat' | 'thread';
  emptyTitle?: string;
  emptySubtitle?: string;
  onLongPress: (m: ChatMessage) => void;
  onReply: (m: ChatMessage) => void;
  onReact: (m: ChatMessage, emoji: string) => void;
  onRetry: (m: ChatMessage) => void;
  onDiscard: (m: ChatMessage) => void;
  onScrollBegin?: () => void;
};

export const ChatMessageList = React.forwardRef<{ scrollToEnd: () => void }, Props>(
  function ChatMessageList(props, ref) {
    const {
      messages,
      loading,
      theme,
      meId,
      header,
      layout = 'chat',
      emptyTitle = 'No messages yet',
      emptySubtitle = 'Be the first to say something.',
      onLongPress,
      onReply,
      onReact,
      onRetry,
      onDiscard,
      onScrollBegin,
    } = props;
    const listRef = useRef<FlatList<Entry>>(null);
    const [showJump, setShowJump] = useState(false);
    const [pinsOpen, setPinsOpen] = useState(false);

    const isThread = layout === 'thread';
    const entries = useMemo(() => buildEntries(messages, !isThread), [messages, isThread]);
    const pinned = useMemo(() => messages.filter((m) => m.pinned), [messages]);

    React.useImperativeHandle(ref, () => ({
      scrollToEnd: () =>
        isThread
          ? listRef.current?.scrollToEnd({ animated: true })
          : listRef.current?.scrollToOffset({ offset: 0, animated: true }),
    }));

    const jumpTo = useCallback(
      (id: string) => {
        const index = entries.findIndex((e) => e.kind === 'message' && e.message.id === id);
        if (index >= 0) {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }
      },
      [entries]
    );

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = e.nativeEvent.contentOffset.y > 320;
      setShowJump((prev) => (prev === next ? prev : next));
    };

    return (
      <View style={styles.flex}>
        {pinned.length > 0 ? (
          <View style={[styles.pinStrip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable
              onPress={() => setPinsOpen((o) => !o)}
              style={styles.pinHead}
              accessibilityRole="button"
              accessibilityLabel="Toggle pinned messages"
            >
              <Ionicons name="pin" size={13} color="#D97706" />
              <Text style={[styles.pinTitle, { color: theme.text }]} numberOfLines={1}>
                {pinned.length} pinned
                {!pinsOpen
                  ? ` · ${pinned[pinned.length - 1].authorName}: ${filterProfanity(pinned[pinned.length - 1].content)}`
                  : ''}
              </Text>
              <Ionicons name={pinsOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.muted} />
            </Pressable>
            {pinsOpen
              ? pinned.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setPinsOpen(false);
                      jumpTo(p.id);
                    }}
                    style={styles.pinItem}
                  >
                    <Text style={[styles.pinAuthor, { color: theme.accent }]}>{p.authorName}</Text>
                    <Text style={[styles.pinBody, { color: theme.text }]} numberOfLines={2}>
                      {filterProfanity(p.content)}
                    </Text>
                  </Pressable>
                ))
              : null}
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={entries}
          inverted={!isThread}
          keyExtractor={(e) => e.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScroll={onScroll}
          scrollEventThrottle={64}
          onScrollBeginDrag={onScrollBegin}
          initialNumToRender={18}
          windowSize={9}
          maxToRenderPerBatch={12}
          removeClippedSubviews
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          contentContainerStyle={styles.content}
          ListHeaderComponent={isThread ? (header ?? null) : null}
          ListFooterComponent={isThread ? null : (header ?? null)}
          ListEmptyComponent={
            <View style={[styles.empty, !isThread && { transform: [{ scaleY: -1 }] }]}>
              {loading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <>
                  <Ionicons name="chatbubbles-outline" size={34} color={theme.muted} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>{emptyTitle}</Text>
                  <Text style={[styles.emptySub, { color: theme.muted }]}>{emptySubtitle}</Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'divider' ? (
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.dividerText, { color: theme.muted }]}>{item.label}</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>
            ) : (
              <ChatMessageRow
                message={item.message}
                showHeader={item.showHeader}
                theme={theme}
                meId={meId}
                onLongPress={onLongPress}
                onReply={onReply}
                onReact={onReact}
                onRetry={onRetry}
                onDiscard={onDiscard}
                onJumpTo={jumpTo}
              />
            )
          }
        />

        {showJump ? (
          <Pressable
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
            style={[styles.jump, { backgroundColor: theme.accent }]}
            accessibilityRole="button"
            accessibilityLabel={isThread ? 'Back to top' : 'Jump to latest messages'}
          >
            <Ionicons name={isThread ? 'arrow-up' : 'arrow-down'} size={14} color="#FFFFFF" />
            <Text style={styles.jumpText}>{isThread ? 'Top' : 'Latest'}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: 8 },
  pinStrip: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 6 },
  pinHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinTitle: { flex: 1, fontSize: 12, fontWeight: '700' },
  pinItem: { paddingVertical: 6, paddingLeft: 19 },
  pinAuthor: { fontSize: 12, fontWeight: '800' },
  pinBody: { fontSize: 13 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginTop: 14, marginBottom: 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 28, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  jump: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  jumpText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
