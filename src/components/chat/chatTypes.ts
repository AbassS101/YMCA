import { isStaffRole as isCapabilityStaffRole } from '@/domain/staffCapabilities';
import type { StaffRole, UserRole } from '@/domain/types';

export type ChatMessageStatus = 'sent' | 'pending' | 'failed';

export type ChatReplyRef = {
  id: string;
  authorName: string;
  excerpt: string;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole | StaffRole | string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  reactions: Record<string, string[]>;
  replyTo?: ChatReplyRef;
  pinned?: boolean;
  isStaff: boolean;
  status: ChatMessageStatus;
};

export type ChatIdentity = {
  userId: string;
  name: string;
  role: UserRole | string;
  avatarUrl?: string;
  isStaff: boolean;
};

export type ChatDraft = {
  content: string;
  replyTo?: ChatReplyRef;
  pinned?: boolean;
};

export type ChatSource = {
  list(): Promise<ChatMessage[]>;
  send(draft: ChatDraft): Promise<ChatMessage>;
  edit(id: string, content: string): Promise<ChatMessage>;
  toggleReaction(id: string, emoji: string): Promise<ChatMessage>;
  remove(id: string): Promise<void>;
  togglePin?(id: string): Promise<ChatMessage>;
  /** Returns the created ticket number. */
  report(message: ChatMessage, reason: string, details: string): Promise<string>;
};

export const QUICK_EMOJIS = ['❤️', '👍', '😂', '💪', '🎉', '👀'];

export function isStaffRole(role?: string): boolean {
  return isCapabilityStaffRole(role);
}

export function excerptOf(text: string, max = 90): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
