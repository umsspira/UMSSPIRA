import { DependencyUnavailableError } from '../../../../shared/errors/dependency-unavailable-error';

/** El filtro global traduce las dependencias no disponibles a HTTP 503. */
export class AffinityDictionaryUnavailableError extends DependencyUnavailableError {
  override readonly code = 'NLP_DICTIONARY_UNAVAILABLE';

  constructor() {
    super();
    this.message = 'El diccionario de palabras clave no está disponible temporalmente';
  }
}
