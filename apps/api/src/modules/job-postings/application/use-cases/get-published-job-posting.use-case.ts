import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PublishedJobPostingDetail } from '../../domain/entities/published-job-posting.entity';
import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import type { PublishedTechnicalRequirementsReader } from '../ports/published-technical-requirements-reader.port';

const UUID_PATTERN = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export class GetPublishedJobPostingUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly requirements: PublishedTechnicalRequirementsReader,
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

    const publishedTechnicalRequirements =
      await this.requirements.obtenerRequisitos(posting.id);

    // HU9 todavía no provee un cálculo de afinidad. No inferimos una cifra con
    // reglas locales: mantenemos un resultado explícitamente no disponible.
    const affinityMessage =
      actor.role === 'titulado' && actor.scopes.graduateId
        ? 'No fue posible calcular la afinidad en este momento.'
        : 'La afinidad estará disponible cuando exista un perfil de egresado asociado.';

    return {
      ...posting,
      affinityPercentage: null,
      affinityMessage,
      publishedTechnicalRequirements,
    };
  }
}
