import type { JobPosting } from '../../domain/entities/job-posting.entity';
import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import type { CreateJobPostingInput } from '../contracts/create-job-posting.input';

export const JOB_POSTING_REPOSITORY = Symbol('JOB_POSTING_REPOSITORY');

export interface JobPostingRepository {
  create(ownerId: string, input: CreateJobPostingInput, now: Date): Promise<JobPosting | null>;
  listPublished(now: Date): Promise<PublishedJobPosting[]>;
  findPublishedById(id: string, now: Date): Promise<PublishedJobPosting | null>;
}
