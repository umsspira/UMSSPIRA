import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import { isJobPostingAvailable } from '../../domain/policies/job-posting-availability.policy';
import type { JobPostingDetailCandidate } from '../contracts/available-job-posting';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';

export class GetAvailableJobPostingUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(id: string): Promise<JobPostingDetailCandidate> {
    const posting = await this.jobs.findById(id);
    if (
      !posting ||
      !isJobPostingAvailable(posting.status, posting.closingDate, this.now())
    ) {
      throw new JobPostingNotFoundError();
    }
    return posting;
  }
}
