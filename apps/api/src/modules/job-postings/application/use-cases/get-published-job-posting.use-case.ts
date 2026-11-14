import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { calculateJobPostingAffinity } from '../../domain/policies/job-posting-affinity.policy';
import type { PublishedJobPostingDetail } from '../../domain/entities/published-job-posting.entity';
import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';

const UUID_PATTERN = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export class GetPublishedJobPostingUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    id: string,
    actor: ActorContext,
  ): Promise<PublishedJobPostingDetail> {
    if (!UUID_PATTERN.test(id)) {
      throw new JobPostingNotFoundError();
    }

    const posting = await this.jobs.findPublishedById(id, this.now());
    if (!posting) {
      throw new JobPostingNotFoundError();
    }

    const graduateId =
      actor.role === 'titulado' ? actor.scopes.graduateId : null;
    const graduateSkills = graduateId
      ? await this.jobs.findGraduateSkills(graduateId)
      : null;
    const affinityPercentage = calculateJobPostingAffinity(
      graduateSkills,
      posting.technicalRequirements,
    );

    return { ...posting, affinityPercentage };
  }
}
