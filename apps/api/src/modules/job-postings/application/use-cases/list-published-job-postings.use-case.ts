import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { calculateJobPostingAffinity } from '../../domain/policies/job-posting-affinity.policy';
import type { PublishedJobPostingDetail } from '../../domain/entities/published-job-posting.entity';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { DependencyUnavailableError } from '../../../../shared/errors/dependency-unavailable-error';
import type {
  PublishedJobPostingSearch,
  PublishedJobPostingSearchOptions,
} from '../ports/published-job-posting-search.port';

export class ListPublishedJobPostingsUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly search?: PublishedJobPostingSearch,
  ) {}

  async execute(
    actor: ActorContext,
    options: PublishedJobPostingSearchOptions = {},
  ): Promise<PublishedJobPostingDetail[]> {
    const referenceTime = this.now();
    const term = options.search?.trim();
    const postings = term
      ? await this.findMatches({ ...options, search: term }, referenceTime)
      : await this.jobs.listPublished(referenceTime);
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

  private async findMatches(
    options: PublishedJobPostingSearchOptions & { search: string },
    now: Date,
  ) {
    if (!this.search) {
      throw new DependencyUnavailableError(
        'JOB_POSTINGS_SEARCH_UNAVAILABLE',
        'La busqueda no esta disponible temporalmente. Intenta nuevamente.',
      );
    }
    const ids = await this.search.findIds(options, now);
    if (ids.length === 0) {
      return [];
    }
    const postings = await this.jobs.listPublished(now, ids);
    const byId = new Map(
      postings.map((posting) => [posting.id.toLowerCase(), posting]),
    );
    // Conserva la ventana y el orden de HU7. No rellena huecos ni publica el total del indice.
    return ids.flatMap((id) => {
      const posting = byId.get(id.toLowerCase());
      return posting ? [posting] : [];
    });
  }
}
