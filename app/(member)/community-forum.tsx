import React from 'react';
import { useRouter } from 'expo-router';
import { CommunityForumView } from '@/components/CommunityForumView';

export default function MemberCommunityForumScreen() {
  const router = useRouter();

  return (
    <CommunityForumView
      isTabScreen={false}
      onBack={() => router.back()}
    />
  );
}
