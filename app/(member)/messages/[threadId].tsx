import { useLocalSearchParams } from 'expo-router';

import { DirectConversation } from '@/components/messaging/DirectConversation';

export default function MemberThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  return <DirectConversation threadId={threadId ?? ''} fallbackHref="/(member)/messages" />;
}
