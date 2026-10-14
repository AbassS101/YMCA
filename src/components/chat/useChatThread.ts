import { useCallback, useEffect, useRef, useState } from 'react';
import {
  excerptOf,
  type ChatDraft,
  type ChatIdentity,
  type ChatMessage,
  type ChatSource,
} from './chatTypes';

type Options = {
  source: ChatSource | null;
  me: ChatIdentity;
  enabled: boolean;
  onSent?: (message: ChatMessage) => void;
  onRemoved?: (id: string) => void;
};

function toggleLocal(m: ChatMessage, emoji: string, userId: string): ChatMessage {
  const reactions = { ...m.reactions };
  const users = reactions[emoji] ?? [];
  const next = users.includes(userId) ? users.filter((u) => u !== userId) : [...users, userId];
  if (next.length === 0) delete reactions[emoji];
  else reactions[emoji] = next;
  return { ...m, reactions };
}

export function useChatThread({ source, me, enabled, onSent, onRemoved }: Options) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const sourceRef = useRef(source);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  const editTargetRef = useRef<ChatMessage | null>(null);
  useEffect(() => {
    editTargetRef.current = editTarget;
  }, [editTarget]);
  const draftsRef = useRef<Record<string, ChatDraft>>({});

  const load = useCallback(async () => {
    const src = sourceRef.current;
    if (!src) return;
    try {
      const list = await src.list();
      // keep unsent local messages
      setMessages((prev) => {
        const next = [...list, ...prev.filter((m) => m.status !== 'sent')];
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
      });
    } catch {
      // keep existing
    }
  }, []);

  useEffect(() => {
    if (!enabled || !source) return;
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    setMessages([]);
    setReplyTarget(null);
    setEditTarget(null);
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    source
      .list()
      .then((list) => {
        if (active) setMessages(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, source]);

  // Pick up new messages from the other side while the conversation is open.
  useEffect(() => {
    if (!enabled || !source) return;
    const id = setInterval(() => {
      if (editTargetRef.current) return;
      void load();
    }, 4000);
    return () => clearInterval(id);
  }, [enabled, source, load]);

  const deliver = useCallback(
    async (tempId: string, draft: ChatDraft) => {
      const src = sourceRef.current;
      if (!src) return;
      try {
        const saved = await src.send(draft);
        setMessages((prev) =>
          prev.filter((m) => m.id !== saved.id).map((m) => (m.id === tempId ? saved : m))
        );
        delete draftsRef.current[tempId];
        onSent?.(saved);
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        );
      }
    },
    [onSent]
  );

  const send = useCallback(
    (content: string, opts?: { pinned?: boolean }) => {
      const text = content.trim();
      if (!text) return;

      if (editTarget) {
        const target = editTarget;
        setEditTarget(null);
        const before = messages.find((m) => m.id === target.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === target.id ? { ...m, content: text, editedAt: new Date().toISOString() } : m
          )
        );
        sourceRef.current
          ?.edit(target.id, text)
          .then((saved) => setMessages((prev) => prev.map((m) => (m.id === saved.id ? saved : m))))
          .catch(() => {
            if (before) setMessages((prev) => prev.map((m) => (m.id === before.id ? before : m)));
          });
        return;
      }

      const draft: ChatDraft = {
        content: text,
        pinned: opts?.pinned,
        replyTo: replyTarget
          ? {
              id: replyTarget.id,
              authorName: replyTarget.authorName,
              excerpt: excerptOf(replyTarget.content),
            }
          : undefined,
      };
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      draftsRef.current[tempId] = draft;
      const optimistic: ChatMessage = {
        id: tempId,
        authorId: me.userId,
        authorName: me.name,
        authorRole: me.role,
        authorAvatarUrl: me.avatarUrl,
        content: text,
        createdAt: new Date().toISOString(),
        reactions: {},
        replyTo: draft.replyTo,
        pinned: draft.pinned,
        isStaff: me.isStaff,
        status: 'pending',
      };
      setMessages((prev) => [...prev, optimistic]);
      setReplyTarget(null);
      void deliver(tempId, draft);
    },
    [editTarget, replyTarget, messages, me, deliver]
  );

  const retry = useCallback(
    (id: string) => {
      const draft = draftsRef.current[id];
      if (!draft) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'pending' } : m)));
      void deliver(id, draft);
    },
    [deliver]
  );

  const discard = useCallback((id: string) => {
    delete draftsRef.current[id];
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const react = useCallback(
    (id: string, emoji: string) => {
      if (id.startsWith('tmp-')) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? toggleLocal(m, emoji, me.userId) : m)));
      sourceRef.current
        ?.toggleReaction(id, emoji)
        .then((saved) => setMessages((prev) => prev.map((m) => (m.id === saved.id ? saved : m))))
        .catch(() =>
          setMessages((prev) => prev.map((m) => (m.id === id ? toggleLocal(m, emoji, me.userId) : m)))
        );
    },
    [me.userId]
  );

  const remove = useCallback(
    async (id: string) => {
      if (id.startsWith('tmp-')) {
        discard(id);
        return;
      }
      const snapshot = messages;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (replyTarget?.id === id) setReplyTarget(null);
      if (editTarget?.id === id) setEditTarget(null);
      try {
        await sourceRef.current?.remove(id);
        onRemoved?.(id);
      } catch {
        setMessages(snapshot);
      }
    },
    [messages, replyTarget, editTarget, discard, onRemoved]
  );

  const togglePin = useCallback(async (id: string) => {
    const src = sourceRef.current;
    if (!src?.togglePin) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)));
    try {
      const saved = await src.togglePin(id);
      setMessages((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)));
    }
  }, []);

  return {
    messages,
    loading,
    replyTarget,
    editTarget,
    setReplyTarget: (m: ChatMessage | null) => {
      setEditTarget(null);
      setReplyTarget(m);
    },
    setEditTarget: (m: ChatMessage | null) => {
      setReplyTarget(null);
      setEditTarget(m);
    },
    send,
    retry,
    discard,
    react,
    remove,
    togglePin,
    reload: load,
  };
}
