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
    const graduateId = actor.role === 'titulado' ? actor.scopes.graduateId : null;
    const graduateSkills = graduateId && postings.length > 0
      ? await this.jobs.findGraduateSkills(graduateId)
      : null;

    return postings
      .map((posting) => ({
        ...posting,
        affinityPercentage: graduateId
          ? calculateJobPostingAffinity(graduateSkills, posting.technicalRequirements)
          : null,
      }))
      .sort(comparePublishedPostings);
  }
}

function comparePublishedPostings(
  left: PublishedJobPostingDetail,
  right: PublishedJobPostingDetail,
): number {
  if (left.affinityPercentage === null && right.affinityPercentage !== null) {
    return 1;
  }
  if (left.affinityPercentage !== null && right.affinityPercentage === null) {
    return -1;
  }

  if (
    left.affinityPercentage !== null &&
    right.affinityPercentage !== null &&
    left.affinityPercentage !== right.affinityPercentage
  ) {
    return right.affinityPercentage - left.affinityPercentage;
  }

  const leftPublishedAt = left.publishedAt?.getTime() ?? null;
  const rightPublishedAt = right.publishedAt?.getTime() ?? null;
  if (leftPublishedAt === null && rightPublishedAt !== null) {
    return 1;
  }
  if (leftPublishedAt !== null && rightPublishedAt === null) {
    return -1;
  }
  if (leftPublishedAt !== null && rightPublishedAt !== null && leftPublishedAt !== rightPublishedAt) {
    return rightPublishedAt - leftPublishedAt;
  }

  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
