import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';

export class ListPublishedJobPostingsUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(): Promise<PublishedJobPosting[]> {
    return this.jobs.listPublished(this.now());
  }
}
