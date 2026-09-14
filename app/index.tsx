import { Redirect } from 'expo-router';

import { useSession } from '@/context/SessionContext';

export default function IndexScreen() {
  const { session } = useSession();

  if (session == null) {
    return <Redirect href="/login" />;
  }

  if (session.role === 'staff') {
    return <Redirect href="/(staff)/today" />;
  }

  return <Redirect href="/(member)/home" />;
}
