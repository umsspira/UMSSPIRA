import type { TechnicalRequirementsForVacancy } from '../../domain/entities/technical-requirement.entity';
import type { SaveTechnicalRequirementsInput } from '../contracts/technical-requirement.input';

export const TECHNICAL_REQUIREMENTS_REPOSITORY = Symbol('TECHNICAL_REQUIREMENTS_REPOSITORY');

export interface TechnicalRequirementsRepository {
  findForVacancy(
    vacancyId: string,
    companyIds: readonly string[],
  ): Promise<TechnicalRequirementsForVacancy | null>;

  replaceForVacancy(
    vacancyId: string,
    companyIds: readonly string[],
    requirements: SaveTechnicalRequirementsInput,
  ): Promise<TechnicalRequirementsForVacancy | null>;
}
