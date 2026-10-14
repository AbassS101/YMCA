import type { ClassForumPost, ForumReply, ForumTopic, Message, ScheduleItem } from '@/domain/types';
import { messageRepo } from '@/repositories/messageRepo';
import { forumRepo } from '@/repositories/forumRepo';
import { classForumRepo } from '@/repositories/classForumRepo';
import { parseMentionedStaffIds } from './mentions';
import { isStaffRole, type ChatIdentity, type ChatMessage, type ChatSource } from './chatTypes';

function replyToRef(id?: string, name?: string, excerpt?: string) {
  return id ? { id, authorName: name ?? 'Unknown', excerpt: excerpt ?? '' } : undefined;
}

export function forumReplyToMessage(r: ForumReply): ChatMessage {
  const reactions =
    r.reactions ?? (r.likedBy?.length ? { '❤️': [...r.likedBy] } : ({} as Record<string, string[]>));
  return {
    id: r.id,
    authorId: r.authorId,
    authorName: r.authorName,
    authorRole: r.authorRole,
    authorAvatarUrl: r.authorAvatarUrl,
    content: r.content,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    reactions,
    replyTo: replyToRef(r.replyToId, r.replyToAuthorName, r.replyToExcerpt),
    isStaff: r.isStaffReply,
    status: 'sent',
  };
}

export function classPostToMessage(p: ClassForumPost): ChatMessage {
  return {
    id: p.id,
    authorId: p.authorId,
    authorName: p.authorName,
    authorRole: p.authorRole,
    authorAvatarUrl: p.authorAvatarUrl,
    content: p.content,
    createdAt: p.createdAt,
    editedAt: p.editedAt,
    reactions: p.reactions ?? {},
    replyTo: replyToRef(p.replyToId, p.replyToAuthorName, p.replyToExcerpt),
    pinned: p.pinned,
    isStaff: isStaffRole(String(p.authorRole)),
    status: 'sent',
  };
}

export function forumSource(api: any, topic: ForumTopic, me: ChatIdentity): ChatSource {
  return {
    async list() {
      const list = await forumRepo.listReplies(api, topic.id);
      return list.map(forumReplyToMessage);
    },
    async send(draft) {
      const r = await forumRepo.createReply(api, {
        topicId: topic.id,
        content: draft.content,
        authorId: me.userId,
        authorName: me.name,
        authorRole: me.role,
        authorAvatarUrl: me.avatarUrl,
        isStaffReply: me.isStaff,
        mentionedStaffIds: parseMentionedStaffIds(draft.content),
        replyToId: draft.replyTo?.id,
        replyToAuthorName: draft.replyTo?.authorName,
        replyToExcerpt: draft.replyTo?.excerpt,
      });
      return forumReplyToMessage(r);
    },
    async edit(id, content) {
      return forumReplyToMessage(await forumRepo.editReply(api, id, me.userId, content));
    },
    async toggleReaction(id, emoji) {
      return forumReplyToMessage(await forumRepo.toggleReplyReaction(api, id, me.userId, emoji));
    },
    remove(id) {
      return forumRepo.deleteReply(api, id, me.userId);
    },
    async report(message, reason, details) {
      const { ticket } = await forumRepo.reportContent(api, {
        reporterId: me.userId,
        reporterName: me.name,
        reporterRole: me.role,
        targetType: 'reply',
        targetId: message.id,
        targetAuthorId: message.authorId,
        targetAuthorName: message.authorName,
        targetContent: message.content,
        contextTitle: topic.title,
        reason,
        details,
      });
      return ticket.ticketNumber;
    },
  };
}

export function classSource(api: any, item: ScheduleItem, me: ChatIdentity): ChatSource {
  return {
    async list() {
      const list = await classForumRepo.list(api, item.id);
      return list.map(classPostToMessage);
    },
    async send(draft) {
      const p = await classForumRepo.create(api, {
        classId: item.id,
        authorId: me.userId,
        authorName: me.name,
        authorRole: me.role,
        authorAvatarUrl: me.avatarUrl,
        content: draft.content,
        pinned: draft.pinned,
        replyToId: draft.replyTo?.id,
        replyToAuthorName: draft.replyTo?.authorName,
        replyToExcerpt: draft.replyTo?.excerpt,
      });
      return classPostToMessage(p);
    },
    async edit(id, content) {
      return classPostToMessage(await classForumRepo.edit(api, id, me.userId, content));
    },
    async toggleReaction(id, emoji) {
      return classPostToMessage(await classForumRepo.toggleReaction(api, id, me.userId, emoji));
    },
    remove(id) {
      return classForumRepo.delete(api, id, me.userId);
    },
    async togglePin(id) {
      return classPostToMessage(await classForumRepo.togglePin(api, id, me.userId));
    },
    async report(message, reason, details) {
      const { ticket } = await classForumRepo.reportPost(api, {
        reporterId: me.userId,
        reporterName: me.name,
        reporterRole: me.role,
        targetId: message.id,
        targetAuthorId: message.authorId,
        targetAuthorName: message.authorName,
        targetContent: message.content,
        contextTitle: `${item.title} (${item.instructorName})`,
        reason,
        details,
      });
      return ticket.ticketNumber;
    },
  };
}

export type DirectParticipant = {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  isStaff: boolean;
};

export function directMessageToChat(
  m: Message,
  people: Record<string, DirectParticipant>
): ChatMessage {
  const p = people[m.fromId];
  return {
    id: m.id,
    authorId: m.fromId,
    authorName: p?.name ?? 'Unknown',
    authorRole: p?.role ?? 'member',
    authorAvatarUrl: p?.avatarUrl,
    content: m.body,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    reactions: m.reactions ?? {},
    replyTo: replyToRef(m.replyToId, m.replyToAuthorName, m.replyToExcerpt),
    isStaff: p?.isStaff ?? false,
    status: 'sent',
  };
}

/** One-to-one conversation between a member and a staff member. */
export function directMessageSource(
  api: any,
  threadId: string,
  me: ChatIdentity,
  people: Record<string, DirectParticipant>,
  contextTitle: string
): ChatSource {
  return {
    async list() {
      const list = await messageRepo.listMessages(api, threadId);
      return [...list]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((m) => directMessageToChat(m, people));
    },
    async send(draft) {
      const m = await messageRepo.sendMessage(api, {
        threadId,
        fromId: me.userId,
        body: draft.content,
        replyToId: draft.replyTo?.id,
        replyToAuthorName: draft.replyTo?.authorName,
        replyToExcerpt: draft.replyTo?.excerpt,
      });
      return directMessageToChat(m, people);
    },
    async edit(id, content) {
      return directMessageToChat(await messageRepo.editMessage(api, id, me.userId, content), people);
    },
    async toggleReaction(id, emoji) {
      return directMessageToChat(await messageRepo.toggleReaction(api, id, me.userId, emoji), people);
    },
    remove(id) {
      return messageRepo.deleteMessage(api, id, me.userId);
    },
    async report(message, reason, details) {
      const { ticket } = await classForumRepo.reportPost(api, {
        reporterId: me.userId,
        reporterName: me.name,
        reporterRole: me.role,
        targetId: message.id,
        targetAuthorId: message.authorId,
        targetAuthorName: message.authorName,
        targetContent: message.content,
        contextTitle,
        reason,
        details,
      });
      return ticket.ticketNumber;
    },
  };
}