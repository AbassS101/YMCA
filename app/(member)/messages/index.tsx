import { MessagesInbox } from '@/components/messaging/MessagesInbox';

export default function MemberMessagesScreen() {
  return <MessagesInbox mode="member" threadBase="/(member)/messages" />;
}
