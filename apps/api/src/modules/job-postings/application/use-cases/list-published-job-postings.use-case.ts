import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { calculateJobPostingAffinity } from '../../domain/policies/job-posting-affinity.policy';
import type { PublishedJobPostingDetail } from '../../domain/entities/published-job-posting.entity';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';

export class ListPublishedJobPostingsUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(actor: ActorContext): Promise<PublishedJobPostingDetail[]> {
    const postings = await this.jobs.listPublished(this.now());
    const graduateId =
      actor.role === 'titulado' ? actor.scopes.graduateId : null;
    const graduateSkills =
      graduateId && postings.length > 0
        ? await this.jobs.findGraduateSkills(graduateId)
        : null;

    return postings.map((posting) => ({
      ...posting,
      affinityPercentage: calculateJobPostingAffinity(
        graduateSkills,
        posting.technicalRequirements,
      ),
    }));
  }
}
