import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { DependencyUnavailableError } from '../../../../shared/errors/dependency-unavailable-error';
import { ResourceNotFoundError } from '../../../../shared/errors/resource-not-found-error';

export class JobPostingTechnicalRequirementsNotFoundError extends ResourceNotFoundError {
  constructor() {
    super('JOB_POSTING_NOT_FOUND', 'No se encontró la vacante solicitada');
  }
}

export class DuplicateTechnicalRequirementError extends BusinessRuleError {
  constructor() {
    super(
      'conflict',
      'DUPLICATE_TECHNICAL_REQUIREMENT',
      'Cada competencia técnica solo puede agregarse una vez por vacante',
    );
  }
}

export class TechnicalRequirementsSchemaNotAppliedError extends DependencyUnavailableError {
  constructor() {
    super(
      'TECHNICAL_REQUIREMENTS_UNAVAILABLE',
      'La estructura de requisitos técnicos aún no está disponible en esta base de datos',
    );
  }
}
