import React, { memo, useRef } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { UserAvatar } from '@/components/UserAvatar';
import { RichText } from './RichText';
import type { ChatTheme } from './chatTheme';
import type { ChatMessage } from './chatTypes';

export function roleTag(role: string): { label: string; color: string } | null {
  if (role === 'it_admin') return { label: 'IT ADMIN', color: '#6D28D9' };
  if (role === 'admin' || role === 'staff_admin') return { label: 'STAFF ADMIN', color: '#7C3AED' };
  if (role === 'child_watch_director') return { label: 'CHILD WATCH DIR', color: '#B45309' };
  if (role === 'maintenance') return { label: 'MAINTENANCE', color: '#B45309' };
  if (role === 'child_watch_supervisor') return { label: 'CHILD WATCH SUP', color: '#B45309' };
  if (role === 'wellness_director') return { label: 'WELLNESS DIR', color: '#9D174D' };
  if (role === 'aquatics_director') return { label: 'AQUATICS DIR', color: '#0369A1' };
  if (role === 'membership_director') return { label: 'MEMBERSHIP DIR', color: '#4338CA' };
  if (role === 'swim_instructor') return { label: 'SWIM INSTRUCTOR', color: '#0284C7' };
  if (role === 'trainer') return { label: 'TRAINER', color: '#15803D' };
  if (role === 'desk') return { label: 'FRONT DESK', color: '#0284C7' };
  if (role === 'staff') return { label: 'STAFF', color: '#0284C7' };
  return null;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type Props = {
  message: ChatMessage;
  showHeader: boolean;
  theme: ChatTheme;
  meId: string;
  onLongPress: (m: ChatMessage) => void;
  onReply: (m: ChatMessage) => void;
  onReact: (m: ChatMessage, emoji: string) => void;
  onRetry: (m: ChatMessage) => void;
  onDiscard: (m: ChatMessage) => void;
  onJumpTo?: (id: string) => void;
};

function ChatMessageRowImpl({
  message: m,
  showHeader,
  theme,
  meId,
  onLongPress,
  onReply,
  onReact,
  onRetry,
  onDiscard,
  onJumpTo,
}: Props) {
  const swipeRef = useRef<SwipeableMethods>(null);
  const tag = roleTag(String(m.authorRole));
  const reactionEntries = Object.entries(m.reactions).filter(([, u]) => u.length > 0);
  const pending = m.status === 'pending';
  const failed = m.status === 'failed';
  const sent = m.status === 'sent';

  const body = (
    <Pressable
      onPress={Keyboard.dismiss}
      onLongPress={() => sent && onLongPress(m)}
      delayLongPress={280}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.hover : 'transparent' },
        showHeader && styles.rowWithHeader,
        m.pinned && { backgroundColor: theme.isDark ? 'rgba(217,119,6,0.10)' : 'rgba(251,191,36,0.12)' },
      ]}
      accessibilityHint="Hold for message options"
    >
      {m.isStaff ? <View style={[styles.staffBar, { backgroundColor: theme.staffBar }]} /> : null}

      <View style={styles.gutter}>
        {showHeader ? (
          <UserAvatar uri={m.authorAvatarUrl} name={m.authorName} size={38} />
        ) : (
          <Text style={[styles.gutterTime, { color: theme.muted }]} numberOfLines={1}>
            {formatClock(m.createdAt).replace(/\s?[AP]M/i, '')}
          </Text>
        )}
      </View>

      <View style={styles.main}>
        {m.replyTo ? (
          <Pressable
            onPress={() => onJumpTo?.(m.replyTo!.id)}
            style={styles.quote}
            accessibilityRole="button"
            accessibilityLabel={`In reply to ${m.replyTo.authorName}`}
          >
            <View style={[styles.quoteBar, { borderColor: theme.quoteBar }]} />
            <Text style={[styles.quoteName, { color: theme.muted }]} numberOfLines={1}>
              @{m.replyTo.authorName}
            </Text>
            <Text style={[styles.quoteText, { color: theme.muted }]} numberOfLines={1}>
              {m.replyTo.excerpt}
            </Text>
          </Pressable>
        ) : null}

        {showHeader ? (
          <View style={styles.headerLine}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {m.authorName}
            </Text>
            {tag ? (
              <View style={[styles.tag, { backgroundColor: tag.color }]}>
                <Text style={styles.tagText}>{tag.label}</Text>
              </View>
            ) : null}
            <Text style={[styles.time, { color: theme.muted }]}>{formatClock(m.createdAt)}</Text>
            {m.pinned ? <Ionicons name="pin" size={11} color="#D97706" /> : null}
          </View>
        ) : null}

        <View style={pending ? { opacity: 0.55 } : undefined}>
          <RichText text={m.content} theme={theme} />
          {m.editedAt ? (
            <Text style={[styles.edited, { color: theme.muted }]}> (edited)</Text>
          ) : null}
        </View>

        {reactionEntries.length > 0 ? (
          <View style={styles.reactions}>
            {reactionEntries.map(([emoji, users]) => {
              const mine = users.includes(meId);
              return (
                <Pressable
                  key={emoji}
                  onPress={() => onReact(m, emoji)}
                  style={[
                    styles.reaction,
                    {
                      backgroundColor: mine ? theme.reactionActiveBg : theme.reactionBg,
                      borderColor: mine ? theme.accent : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${emoji} ${users.length}`}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text
                    style={[styles.reactionCount, { color: mine ? theme.accent : theme.muted }]}
                  >
                    {users.length}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {failed ? (
          <View style={styles.failedRow}>
            <Ionicons name="alert-circle" size={13} color={theme.danger} />
            <Text style={[styles.failedText, { color: theme.danger }]}>Failed to send.</Text>
            <Pressable onPress={() => onRetry(m)} hitSlop={8}>
              <Text style={[styles.failedAction, { color: theme.accent }]}>Retry</Text>
            </Pressable>
            <Pressable onPress={() => onDiscard(m)} hitSlop={8}>
              <Text style={[styles.failedAction, { color: theme.muted }]}>Delete</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {Platform.OS === 'web' && sent ? (
        <Pressable
          onPress={() => onLongPress(m)}
          hitSlop={8}
          style={styles.webMore}
          accessibilityRole="button"
          accessibilityLabel="Message options"
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={theme.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );

  if (!sent) return body;

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={48}
      overshootLeft={false}
      renderLeftActions={() => (
        <View style={styles.swipeAction}>
          <Ionicons name="arrow-undo" size={18} color={theme.accent} />
        </View>
      )}
      onSwipeableOpen={() => {
        swipeRef.current?.close();
        onReply(m);
      }}
    >
      {body}
    </ReanimatedSwipeable>
  );
}

export const ChatMessageRow = memo(ChatMessageRowImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 1.5,
    gap: 10,
  },
  rowWithHeader: { marginTop: 10, paddingTop: 3 },
  staffBar: { position: 'absolute', left: 0, top: 2, bottom: 2, width: 3, borderRadius: 2 },
  gutter: { width: 38, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  gutterTime: { fontSize: 9, fontWeight: '600', opacity: 0.7 },
  main: { flex: 1, minWidth: 0 },
  headerLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 },
  name: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  tag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  time: { fontSize: 11, fontWeight: '500' },
  edited: { fontSize: 10 },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  quoteBar: {
    width: 18,
    height: 10,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 6,
  },
  quoteName: { fontSize: 12, fontWeight: '700' },
  quoteText: { fontSize: 12, flex: 1 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, fontWeight: '700' },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  failedText: { fontSize: 12, fontWeight: '600' },
  failedAction: { fontSize: 12, fontWeight: '800' },
  webMore: { padding: 4, alignSelf: 'flex-start' },
  swipeAction: { width: 56, alignItems: 'center', justifyContent: 'center' },
});
