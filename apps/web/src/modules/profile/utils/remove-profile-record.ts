import type { ProfileRecord } from '@/modules/profile/types/profile-record';

// Quita solo el registro indicado; el resto de la lista conserva su orden
export function removeProfileRecord(records: ProfileRecord[], recordId: string): ProfileRecord[] {
  return records.filter((record) => record.id !== recordId);
}
