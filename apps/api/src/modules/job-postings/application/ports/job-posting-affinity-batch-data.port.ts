import type { JobPostingAffinityRequirements } from './job-posting-affinity-data.port';

export interface JobPostingAffinityBatchApplication {
  applicationId: string;
  userId: string | null;
}


export interface JobPostingAffinityCompanyVacancy {
  vacancy: JobPostingAffinityRequirements;
  applications: JobPostingAffinityBatchApplication[];
}


export interface JobPostingAffinityBatchDataPort {
  readPublicVacancies(
    vacancyIds: readonly string[],
    now: Date,
  ): Promise<JobPostingAffinityRequirements[]>;
  readCompanyVacancyApplications(
    vacancyId: string,
    actorUserId: string,
    applicationIds: readonly string[],
  ): Promise<JobPostingAffinityCompanyVacancy | null>;
}


export const JOB_POSTING_AFFINITY_BATCH_DATA = Symbol('JOB_POSTING_AFFINITY_BATCH_DATA');
