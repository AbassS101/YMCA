import { Redirect, useLocalSearchParams } from 'expo-router';

/** The old Trainers tab is now the Staff page. Kept so saved links and notifications still land somewhere. */
export default function LegacyTrainersRedirect() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <Redirect href={tab ? `/(member)/(tabs)/staff?tab=${tab}` : '/(member)/(tabs)/staff'} />;
}
