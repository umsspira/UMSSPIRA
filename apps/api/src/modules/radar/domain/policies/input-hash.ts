import { createHash } from 'crypto';
import { ALGORITHM_VERSION, DICTIONARY_VERSION } from './affinity-config';

/**
 * Normaliza los textos del perfil para el hash de entrada.
 * Se ordenan para que cambiar el orden de las certificaciones no altere el hash.
 */
export function normalizeTextsForHash(texts: readonly string[]): string {
  return texts
    .map((text) => text.trim().toLowerCase())
    .filter((text) => text.length > 0)
    .sort()
    .join('|');
}

/**
 * Hash SHA-256 de la entrada del cálculo. El prefijo con la versión del algoritmo
 * y la versión del diccionario invalida los hashes anteriores cuando cambia el
 * diccionario o las constantes, dejando los cálculos vigentes como pendientes.
 */
export function calculateInputHash(
  texts: readonly string[],
  dictionaryVersion: string = DICTIONARY_VERSION,
): string {
  const normalizedDictionaryVersion = dictionaryVersion.trim();
  const versionPrefix =
    normalizedDictionaryVersion.length === 0 ||
    ALGORITHM_VERSION.endsWith(`/${normalizedDictionaryVersion}`)
      ? ALGORITHM_VERSION
      : `${ALGORITHM_VERSION}|${normalizedDictionaryVersion}`;

  return createHash('sha256')
    .update(`${versionPrefix}|${normalizeTextsForHash(texts)}`)
    .digest('hex');
}