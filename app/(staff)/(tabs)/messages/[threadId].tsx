import { useLocalSearchParams } from 'expo-router';

import { DirectConversation } from '@/components/messaging/DirectConversation';

export default function StaffThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  return <DirectConversation threadId={threadId ?? ''} fallbackHref="/(staff)/messages" />;
}
