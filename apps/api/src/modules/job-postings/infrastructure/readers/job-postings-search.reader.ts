import { ServiceUnavailableException } from '@nestjs/common';
import { DependencyUnavailableError } from '../../../../shared/errors/dependency-unavailable-error';
import type {
  PublishedJobPostingSearch,
  PublishedJobPostingSearchOptions,
} from '../../application/ports/published-job-posting-search.port';
import type { JobPostingsSearchService } from '../../search/job-postings-search.service';

/** Adapta HU7 a candidatos; no permite trasladar campos del indice al presenter. */
export class JobPostingsSearchReader implements PublishedJobPostingSearch {
  constructor(private readonly search: JobPostingsSearchService) {}

  async findIds(
    options: PublishedJobPostingSearchOptions & { search: string },
    now: Date,
  ): Promise<readonly string[]> {
    try {
      const result = await this.search.findActive(options, now);
      return result.data.map(({ id }) => id.toLowerCase());
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        // El filtro HTTP oficial traduce DependencyUnavailableError a 503.
        throw new DependencyUnavailableError(
          'JOB_POSTINGS_SEARCH_UNAVAILABLE',
          'La busqueda no esta disponible temporalmente. Intenta nuevamente.',
        );
      }
      throw error;
    }
  }
}
