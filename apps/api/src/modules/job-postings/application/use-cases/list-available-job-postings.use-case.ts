import { isJobPostingAvailable } from '../../domain/policies/job-posting-availability.policy';
import type { JobPostingListCandidate } from '../contracts/available-job-posting';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';

export class ListAvailableJobPostingsUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<JobPostingListCandidate[]> {
    const now = this.now();
    const candidates = await this.jobs.listPublished();
    return candidates.filter((posting) =>
      isJobPostingAvailable(posting.status, posting.closingDate, now),
    );
  }
}
