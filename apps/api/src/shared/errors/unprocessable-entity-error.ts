import { AppError } from './app-error';

/**
 * Entrada con formato correcto pero reglas de negocio incumplidas.
 * Expone el detalle por campo para que el cliente señale lo pendiente.
 */
export class UnprocessableEntityError extends AppError {
  constructor(
    code: string,
    message: string,
    public readonly fields: Record<string, string[]>,
  ) {
    super(code, message);
  }
}
