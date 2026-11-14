import { AppError } from './app-error';

export class DependencyUnavailableError extends AppError {
  constructor(
    code = 'RATE_LIMIT_UNAVAILABLE',
    message = 'El control de acceso no está disponible temporalmente',
  ) {
    super(code, message);
  }
}
