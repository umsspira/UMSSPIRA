export interface JobPostingAffinityProfile {
  userId: string;
  tituladoId: string;
  texts: string[];
  description: string | null;
  hasEducation: boolean;
  hasExperience: boolean;
  hasCertification: boolean;
  hasProject: boolean;
}

export interface JobPostingAffinityRequirements {
  vacancyId: string;
  requirements: string[];
}

export const JOB_POSTING_AFFINITY_DATA = Symbol('JOB_POSTING_AFFINITY_DATA');

/** Solo lectura. El consumidor comprueba el alcance antes de solicitar estos IDs. */
export interface JobPostingAffinityDataPort {
  readProfiles(userIds: readonly string[]): Promise<JobPostingAffinityProfile[]>;
  readRequirements(vacancyIds: readonly string[]): Promise<JobPostingAffinityRequirements[]>;
}
