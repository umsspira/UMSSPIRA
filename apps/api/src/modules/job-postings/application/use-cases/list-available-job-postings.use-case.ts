import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { AvailableJobPosting } from '../../domain/entities/available-job-posting.entity';
import { orderJobPostingsByAffinity } from '../../domain/policies/order-job-postings.policy';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { JOB_POSTING_REPOSITORY } from '../ports/job-posting-repository.port';

export class ListAvailableJobPostingsUseCase {
  static readonly inject = [JOB_POSTING_REPOSITORY];

  constructor(private readonly repository: JobPostingRepository) {}

  async execute(actor: ActorContext): Promise<AvailableJobPosting[]> {
    const postings = await this.repository.listAvailable(actor.scopes.graduateId, new Date());
    return orderJobPostingsByAffinity(postings);
  }
}
