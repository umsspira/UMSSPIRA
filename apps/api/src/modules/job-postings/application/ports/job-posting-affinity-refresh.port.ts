import type { JobPostingAffinityResult } from '@umsspira/shared-types';

export const JOB_POSTING_AFFINITY_REFRESH = Symbol('JOB_POSTING_AFFINITY_REFRESH');

export interface AffinityApplication {
  id: string;
  userId: string;
  vacancyId: string;
  inputHash: string | null;
  matchStatus: string | null;
}

export interface JobPostingAffinityRefreshPort {
  listForUser(userId: string, offset: number, limit: number): Promise<AffinityApplication[]>;
  listForVacancy(vacancyId: string, companyUserId: string, offset: number, limit: number): Promise<AffinityApplication[]>;
  listOne(vacancyId: string, companyUserId: string, applicationId: string): Promise<AffinityApplication[]>;
  claim(application: AffinityApplication, inputHash: string): Promise<string | null>;
  releaseClaim(applicationId: string, claimId: string): Promise<void>;
  persistIfCurrent(application: AffinityApplication, inputHash: string, result: JobPostingAffinityResult, claimId: string): Promise<boolean>;
}
