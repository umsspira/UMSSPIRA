import { ResourceNotFoundError } from '../../../../shared/errors/resource-not-found-error';

export class JobPostingNotFoundError extends ResourceNotFoundError {
  constructor() {
    super('JOB_POSTING_NOT_FOUND', 'La vacante no está disponible');
  }
}
