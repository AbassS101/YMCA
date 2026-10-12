import { Redirect } from 'expo-router';

import { useSession } from '@/context/SessionContext';

export default function IndexScreen() {
  const { session, ready } = useSession();

  if (!ready) {
    return null;
  }

  if (session == null) {
    return <Redirect href="/login" />;
  }

  if (session.role === 'member' || session.role === 'guest') {
    return <Redirect href="/(member)/home" />;
  }

  return <Redirect href="/(staff)/today" />;
}
