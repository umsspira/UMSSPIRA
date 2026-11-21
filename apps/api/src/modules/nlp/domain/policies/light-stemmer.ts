/**
 * Stemmer liviano para español e inglés (HU-11 de la Épica 5).
 *
 * Recibe tokens ya normalizados por `normalizeText` (minúsculas y sin tildes) y
 * reduce las variantes de número y género a una misma raíz:
 *   bases / base -> bas, redes / red -> red, automatizadas / automatizado -> automatizad,
 *   aplicaciones / aplicacion -> aplicacion, tests / testing / tested -> test.
 *
 * Es conservador a propósito: no toca tokens cortos (sql, aws, java) ni tokens con
 * símbolos (c++, c#, node.js), para no juntar tecnologías distintas.
 */
const ONLY_LETTERS = /^[a-z]+$/;
const MIN_LENGTH_TO_STEM = 4;
const ENGLISH_SUFFIXES = ['ing', 'ed'] as const;
const FINAL_VOWEL = /[aeo]$/;

export function stemToken(token: string): string {
  if (token.length < MIN_LENGTH_TO_STEM || !ONLY_LETTERS.test(token)) {
    return token;
  }

  let stem = token;

  // Plural en español e inglés: "bases" -> "base", "tests" -> "test" ("ss" se respeta: "css")
  if (stem.endsWith('s') && !stem.endsWith('ss') && stem.length > MIN_LENGTH_TO_STEM) {
    stem = stem.slice(0, -1);
  }

  // Formas verbales en inglés: "testing" -> "test", "tested" -> "test"
  for (const suffix of ENGLISH_SUFFIXES) {
    if (stem.endsWith(suffix) && stem.length - suffix.length >= MIN_LENGTH_TO_STEM) {
      return stem.slice(0, -suffix.length);
    }
  }

  // Género y plural en español: "automatizada" / "automatizado" -> "automatizad"
  // ("redes" -> "rede" -> "red", igual que "red")
  if (FINAL_VOWEL.test(stem) && stem.length >= MIN_LENGTH_TO_STEM) {
    stem = stem.slice(0, -1);
  }

  return stem;
}

export function stemTokens(tokens: readonly string[]): string[] {
  return tokens.map(stemToken);
}
