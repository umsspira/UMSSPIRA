import { HttpError } from '../../../../shared/http/errors/http-error';

export const MIN_CUSTOM_INTEREST_LENGTH = 3;
export const MAX_CUSTOM_INTEREST_LENGTH = 50;
export const MAX_CUSTOM_INTERESTS_PER_AREA = 5;

// Lista de palabras no permitidas / moderación (CANF-12)
const BLOCKED_WORDS = new Set([
  'puta', 'puto', 'mierda', 'carajo', 'pendejo', 'pendeja', 'estupido', 'estupida',
  'idiota', 'imbecil', 'concha', 'coño', 'verga', 'culiao', 'culia', 'hdp',
  'chupame', 'maricon', 'porn', 'porno', 'sexo', 'nazi', 'violador', 'pedofilo',
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick',
]);

/**
 * Normaliza el texto de un interés eliminando espacios sobrantes,
 * convirtiendo a minúsculas y removiendo acentos/diacríticos (CANF-07).
 */
export function normalizeInterestText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Limpia y normaliza los espacios del texto sin cambiar caja ni acentos.
 */
export function sanitizeInterestText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// Patrones de inyección o código malicioso (CANF-06, CAF-11)
const HTML_TAG_REGEX = /<[^>]*>/i;
const SCRIPT_REGEX = /<script\b|javascript:|data:text\/html/i;
const SQL_INJECTION_REGEX = /(--|\b(select|drop|insert|delete|update|alter|truncate|exec|union)\b\s+)/i;
// Caracteres permitidos: letras (incluye acentos/ñ), números, espacios y signos técnicos (+, #, ., -, /, (, ))
const VALID_CHARS_REGEX = /^[\p{L}\p{N}\s+#.\-\/()]+$/u;
const AT_LEAST_ONE_ALPHANUM_REGEX = /[\p{L}\p{N}]/u;

/**
 * Valida un texto de interés personalizado según las reglas CAF-04, CAF-05, CAF-11, CANF-05, CANF-06, CANF-12.
 */
export function validateCustomInterestText(rawText: unknown): string {
  if (typeof rawText !== 'string') {
    throw new HttpError(
      422,
      'TEXTO_REQUERIDO',
      'Escribe un tema de interés',
    );
  }

  const cleaned = sanitizeInterestText(rawText);

  // CAF-04: Campo vacío o solo espacios
  if (!cleaned) {
    throw new HttpError(
      422,
      'TEXTO_REQUERIDO',
      'Escribe un tema de interés',
    );
  }

  // CAF-05: Longitud permitida (3-50)
  if (cleaned.length < MIN_CUSTOM_INTEREST_LENGTH || cleaned.length > MAX_CUSTOM_INTEREST_LENGTH) {
    throw new HttpError(
      422,
      'LONGITUD_INVALIDA',
      `El tema de interés debe tener entre ${MIN_CUSTOM_INTEREST_LENGTH} y ${MAX_CUSTOM_INTEREST_LENGTH} caracteres`,
    );
  }

  // CANF-06, CAF-11: Rechazar HTML, scripts, SQL
  if (HTML_TAG_REGEX.test(rawText) || SCRIPT_REGEX.test(rawText) || SQL_INJECTION_REGEX.test(cleaned)) {
    throw new HttpError(
      422,
      'CARACTERES_INVALIDOS',
      'El texto contiene caracteres no válidos',
    );
  }

  // CAF-11: Caracteres permitidos y al menos una letra o número
  if (!VALID_CHARS_REGEX.test(cleaned) || !AT_LEAST_ONE_ALPHANUM_REGEX.test(cleaned)) {
    throw new HttpError(
      422,
      'CARACTERES_INVALIDOS',
      'El texto contiene caracteres no válidos',
    );
  }

  // CANF-12: Moderación de contenido ofensivo
  const normalized = normalizeInterestText(cleaned);
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (BLOCKED_WORDS.has(word)) {
      throw new HttpError(
        422,
        'CONTENIDO_NO_PERMITIDO',
        'El texto contiene lenguaje no permitido',
      );
    }
  }

  return cleaned;
}
