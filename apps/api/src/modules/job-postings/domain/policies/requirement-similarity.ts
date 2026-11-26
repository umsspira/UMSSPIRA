import type { ExtractionResult } from '../../../nlp/domain/entities/extracted-keyword';
import { stemTokens } from '../../../nlp/domain/policies/light-stemmer';
import { STOPWORDS } from '../../../nlp/domain/policies/stopwords';
import { normalizeText, splitSegments } from '../../../nlp/domain/policies/text-normalizer';

/**
 * HU-11 (Épica 5) · Similitud avanzada del motor de afinidad vacante-perfil.
 *
 * PROVISIONAL: lo consume el servicio de matching de la HU-10 cuando esté integrado.
 * Es dominio puro: no conoce Nest ni Prisma; recibe el extractor del módulo nlp.
 *
 * Cambiar las reglas o los pesos obliga a subir ALGORITHM_VERSION para invalidar los
 * porcentajes calculados con la versión anterior.
 */
export const ALGORITHM_VERSION = 'job-affinity-hu11-v2';

export type RequirementMatchResult = 'exact' | 'similar' | 'not-found';

/** Cuánto suma cada requisito al porcentaje: exacta 100 %, parcial 50 %, sin coincidencia 0 %. */
export const MATCH_WEIGHTS: Readonly<Record<RequirementMatchResult, number>> = {
  exact: 1,
  similar: 0.5,
  'not-found': 0,
};

/** Fracción mínima de palabras del requisito que deben aparecer en un mismo texto del perfil. */
export const MIN_PARTIAL_COVERAGE = 0.5;

/**
 * Palabras de relleno frecuentes en los requisitos que no dicen qué tecnología o área se pide.
 * No impiden la coincidencia exacta («Experiencia en React» = «React») ni bastan para una parcial
 * («Desarrollo móvil» no se parece a «Desarrollo web» solo por «desarrollo»).
 */
export const GENERIC_REQUIREMENT_WORDS: readonly string[] = [
  'experiencia', 'conocimiento', 'conocimientos', 'manejo', 'dominio', 'uso', 'desarrollo', 'programacion',
  'nivel', 'basico', 'intermedio', 'avanzado', 'solido', 'solidos', 'deseable', 'habilidad', 'habilidades',
  'capacidad', 'anos', 'minimo',
];

const GENERIC_STEMS = new Set(stemTokens(GENERIC_REQUIREMENT_WORDS.flatMap((word) => normalizeText(word))));

function isGenericWord(word: string): boolean {
  return stemTokens(normalizeText(word)).every((stem) => GENERIC_STEMS.has(stem));
}

export interface KeywordExtractor {
  extract(text: string): ExtractionResult;
}

export interface RequirementComparison {
  requirement: string;
  matchedSkill: string | null;
  result: RequirementMatchResult;
  weight: number;
}

export interface RequirementSimilarityResult {
  algorithmVersion: string;
  percentage: number;
  comparison: RequirementComparison[];
}

interface ProfileSegment {
  tokens: string[];
  stems: string[];
}

/** Perfil ya procesado por el NLP: se arma una vez y sirve para comparar contra N vacantes. */
export interface ProfileIndex {
  canonicals: Set<string>;
  segments: ProfileSegment[];
}

export function compareRequirements(
  requirements: readonly string[],
  profileTexts: readonly string[],
  extractor: KeywordExtractor,
): RequirementSimilarityResult {
  return compareRequirementsWithProfile(requirements, buildProfileIndex(profileTexts, extractor), extractor);
}

export function compareRequirementsWithProfile(
  requirements: readonly string[],
  profile: ProfileIndex,
  extractor: KeywordExtractor,
): RequirementSimilarityResult {
  const comparison = requirements
    .map((requirement) => requirement.trim())
    .filter((requirement) => normalizeText(requirement).length > 0)
    .map((requirement) => compareRequirement(requirement, profile, extractor));

  const total = comparison.reduce((sum, item) => sum + item.weight, 0);
  const percentage = comparison.length === 0 ? 0 : round2((total / comparison.length) * 100);

  return { algorithmVersion: ALGORITHM_VERSION, percentage, comparison };
}

function compareRequirement(
  requirement: string,
  profile: ProfileIndex,
  extractor: KeywordExtractor,
): RequirementComparison {
  const extraction = extractor.extract(requirement);
  const requirementCanonicals = extraction.keywords.map(({ term }) => term);
  const requirementTokens = normalizeText(requirement);
  const requirementStems = stemTokens(requirementTokens);

  // 1) Requisito fuera del diccionario: la frase completa (por raíces) aparece tal cual en el perfil.
  //    "Bases de datos relacionales" coincide con "base de datos relacional".
  if (requirementCanonicals.length === 0) {
    const segment = profile.segments.find((item) => containsSequence(item.stems, requirementStems));
    if (segment !== undefined) {
      return result(requirement, requirementTokens.join(' '), 'exact');
    }
  }

  // 2) Requisito del diccionario: todas sus canónicas están en el perfil y no le sobran palabras
  //    desconocidas (las genéricas como «experiencia» no cuentan). "JS" coincide con "JavaScript",
  //    "Postgres" con "PostgreSQL" por los alias y «Experiencia en React» con «React».
  const found = requirementCanonicals.filter((canonical) => profile.canonicals.has(canonical));
  const extraWords = extraction.unmapped.filter(({ term }) => !isGenericWord(term));
  if (requirementCanonicals.length > 0 && found.length === requirementCanonicals.length && extraWords.length === 0) {
    return result(requirement, found.join(', '), 'exact');
  }

  // 3a) Parte del requisito está en el perfil: "React Native" con un perfil que tiene "React".
  if (found.length > 0) {
    return result(requirement, found.join(', '), 'similar');
  }

  // 3b) Una canónica contiene a la otra: "Spring" frente a "Spring Boot".
  for (const canonical of requirementCanonicals) {
    const contained = [...profile.canonicals].find((skill) => isContainedEitherWay(canonical, skill));
    if (contained !== undefined) {
      return result(requirement, contained, 'similar');
    }
  }

  // 3c) Requisito fuera del diccionario: al menos la mitad de sus palabras (por raíces) aparece en un mismo
  //     texto del perfil y una de ellas no es genérica. No se aplica a términos del diccionario: «Machine»
  //     solo no es «Machine Learning»; tampoco basta «desarrollo» para unir «Desarrollo móvil» y «Desarrollo web».
  if (requirementCanonicals.length === 0) {
    const partial = findPartialCoverage(requirementTokens, profile.segments);
    if (partial !== null) {
      return result(requirement, partial, 'similar');
    }
  }

  return result(requirement, null, 'not-found');
}

export function buildProfileIndex(texts: readonly string[], extractor: KeywordExtractor): ProfileIndex {
  const canonicals = new Set<string>();
  const segments: ProfileSegment[] = [];

  // Cada campo se extrae por separado para no armar n-gramas entre campos distintos (regla de la HU-10).
  for (const text of texts) {
    extractor.extract(text).keywords.forEach(({ term }) => canonicals.add(term));
    for (const segment of splitSegments(text)) {
      const tokens = normalizeText(segment);
      if (tokens.length > 0) {
        segments.push({ tokens, stems: stemTokens(tokens) });
      }
    }
  }

  return { canonicals, segments };
}

function findPartialCoverage(
  requirementTokens: readonly string[],
  segments: readonly ProfileSegment[],
): string | null {
  const content = requirementTokens.filter((token) => !STOPWORDS.has(token));
  if (content.length < 2) {
    return null;
  }
  const contentStems = stemTokens(content);

  let best: { coverage: number; matched: string[] } | null = null;
  for (const segment of segments) {
    const segmentStems = new Set(segment.stems);
    const hits = new Set(contentStems.filter((stem) => segmentStems.has(stem)));
    const coverage = hits.size / new Set(contentStems).size;
    const hasSpecificHit = [...hits].some((stem) => !GENERIC_STEMS.has(stem));
    if (coverage >= MIN_PARTIAL_COVERAGE && hasSpecificHit && (best === null || coverage > best.coverage)) {
      const matched = segment.tokens.filter((_, index) => hits.has(segment.stems[index] ?? ''));
      best = { coverage, matched: [...new Set(matched)] };
    }
  }

  return best === null ? null : best.matched.join(' ');
}

function isContainedEitherWay(left: string, right: string): boolean {
  if (left === right) {
    return false;
  }
  const leftStems = contentStems(left);
  const rightStems = contentStems(right);
  if (leftStems.length === 0 || rightStems.length === 0) {
    return false;
  }
  const [shorter, longer] =
    leftStems.length <= rightStems.length ? [leftStems, rightStems] : [rightStems, leftStems];
  return shorter.every((stem) => longer.includes(stem));
}

function contentStems(phrase: string): string[] {
  return stemTokens(normalizeText(phrase).filter((token) => !STOPWORDS.has(token)));
}

function containsSequence(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) {
    return false;
  }
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((value, offset) => haystack[start + offset] === value)) {
      return true;
    }
  }
  return false;
}

function result(
  requirement: string,
  matchedSkill: string | null,
  matchResult: RequirementMatchResult,
): RequirementComparison {
  return { requirement, matchedSkill, result: matchResult, weight: MATCH_WEIGHTS[matchResult] };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
