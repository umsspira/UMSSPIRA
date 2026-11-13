import { ProfileRecordsManager } from '@/modules/profile/components/profile-records-manager';
import { toRecordsTab } from '@/modules/profile/data/profile-records-data';

export default function ProfileRecordsPage({ searchParams }: { searchParams: { seccion?: string } }) {
  return <ProfileRecordsManager initialSection={toRecordsTab(searchParams.seccion)} />;
}
