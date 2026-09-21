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

  if (session.role !== 'member') {
    return <Redirect href="/(staff)/today" />;
  }

  return <Redirect href="/(member)/home" />;
}
