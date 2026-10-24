import React, { useEffect, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { MessageActionSheet } from './MessageActionSheet';
import { ReportContentSheet } from './ReportContentSheet';
import { useChatTheme } from './chatTheme';
import { useChatThread } from './useChatThread';
import type { ChatIdentity, ChatMessage, ChatSource } from './chatTypes';

type Props = {
  source: ChatSource | null;
  me: ChatIdentity;
  enabled: boolean;
  header?: React.ReactElement | null;
  /** 'thread' opens at the top with the header (original post) first. Default 'chat'. */
  layout?: 'chat' | 'thread';
  placeholder: string;
  maxLength?: number;
  /** False when the parent navigation bar already provides the bottom safe area. */
  bottomSafeArea?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  /** Whether the current user may delete this message. */
  canDelete: (m: ChatMessage) => boolean;
  deleteLabel?: (m: ChatMessage) => string;
  /** Whether the current user can pin (needs source.togglePin). */
  canPin?: boolean;
  onSent?: (m: ChatMessage) => void;
  onRemoved?: (id: string) => void;
};

export function ChatView({
  source,
  me,
  enabled,
  header,
  layout = 'chat',
  placeholder,
  maxLength,
  bottomSafeArea = true,
  emptyTitle,
  emptySubtitle,
  canDelete,
  deleteLabel,
  canPin = false,
  onSent,
  onRemoved,
}: Props) {
  const theme = useChatTheme();
  const insets = useSafeAreaInsets();
  const thread = useChatThread({ source, me, enabled, onSent, onRemoved });
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null);
  const [reportMsg, setReportMsg] = useState<ChatMessage | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboardContainerRef = React.useRef<View>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const listRef = React.useRef<{ scrollToEnd: () => void }>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const closeAction = () => setActionMsg(null);

  const confirmDelete = (m: ChatMessage) => {
    closeAction();
    if (Platform.OS === 'web') {
      void thread.remove(m.id);
      return;
    }
    Alert.alert('Delete message', 'Remove this message for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void thread.remove(m.id) },
    ]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        ref={keyboardContainerRef}
        style={{ flex: 1 }}
        onLayout={() => keyboardContainerRef.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}
      >
        <KeyboardAvoidingView
          keyboardVerticalOffset={keyboardOffset}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: theme.bg }}
        >
          <ChatMessageList
            ref={listRef}
            messages={thread.messages}
            loading={thread.loading}
            theme={theme}
            meId={me.userId}
            header={header}
            layout={layout}
            emptyTitle={emptyTitle}
            emptySubtitle={emptySubtitle}
            onLongPress={setActionMsg}
            onReply={thread.setReplyTarget}
            onReact={(m, e) => thread.react(m.id, e)}
            onRetry={(m) => thread.retry(m.id)}
            onDiscard={(m) => thread.discard(m.id)}
          />

          <View style={{ paddingBottom: bottomSafeArea && !keyboardVisible ? insets.bottom : 0, backgroundColor: theme.surface }}>
            <ChatComposer
              theme={theme}
              placeholder={placeholder}
              maxLength={maxLength}
              replyTarget={thread.replyTarget}
              editTarget={thread.editTarget}
              canPin={canPin && Boolean(source?.togglePin)}
              onCancelBanner={() => {
                thread.setReplyTarget(null);
                thread.setEditTarget(null);
              }}
              onSend={(text, opts) => {
                thread.send(text, opts);
                setTimeout(() => listRef.current?.scrollToEnd(), 50);
              }}
              onFocus={() => {
                if (layout === 'chat') setTimeout(() => listRef.current?.scrollToEnd(), 120);
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>

      <MessageActionSheet
        message={actionMsg}
        meId={me.userId}
        canEdit={Boolean(actionMsg && actionMsg.authorId === me.userId)}
        canDelete={Boolean(actionMsg && canDelete(actionMsg))}
        canPin={Boolean(actionMsg && canPin && source?.togglePin)}
        deleteLabel={actionMsg ? deleteLabel?.(actionMsg) : undefined}
        onClose={closeAction}
        onReact={(emoji) => actionMsg && thread.react(actionMsg.id, emoji)}
        onReply={() => {
          if (actionMsg) thread.setReplyTarget(actionMsg);
          closeAction();
        }}
        onEdit={() => {
          if (actionMsg) thread.setEditTarget(actionMsg);
          closeAction();
        }}
        onPin={() => {
          if (actionMsg) void thread.togglePin(actionMsg.id);
          closeAction();
        }}
        onDelete={() => actionMsg && confirmDelete(actionMsg)}
        onReport={() => {
          setReportMsg(actionMsg);
          closeAction();
        }}
      />

      <ReportContentSheet
        visible={Boolean(reportMsg)}
        authorName={reportMsg?.authorName ?? ''}
        content={reportMsg?.content ?? ''}
        onClose={() => setReportMsg(null)}
        onSubmit={(reason, details) => {
          if (!source || !reportMsg) return Promise.reject(new Error('no source'));
          return source.report(reportMsg, reason, details);
        }}
      />
    </GestureHandlerRootView>
  );
}
