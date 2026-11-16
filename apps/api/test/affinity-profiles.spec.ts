import { KeywordExtractorService } from '../src/modules/nlp/application/services/keyword-extractor.service';
import type { DictionaryEntry } from '../src/modules/nlp/domain/entities/dictionary-entry';
import { normalizePhrase } from '../src/modules/nlp/domain/policies/text-normalizer';
import { RADAR_DICTIONARY } from '../src/modules/radar/domain/affinity-catalog';
import { calculateAffinity } from '../src/modules/radar/domain/affinity-calculator';
import type { KeywordAreaWeight } from '../src/modules/radar/domain/entities/affinity-calculation';
import type { RadarArea } from '../src/modules/radar/domain/entities/radar-area';

const definitions = new Map<string, Set<string>>();
const weights: KeywordAreaWeight[] = [];

for (const [area, keywords] of Object.entries(RADAR_DICTIONARY) as [
  RadarArea,
  (typeof RADAR_DICTIONARY)[RadarArea],
][]) {
  for (const keyword of keywords) {
    const canonical = normalizePhrase(keyword.term);
    const aliases = definitions.get(canonical) ?? new Set<string>();
    aliases.add(canonical);
    keyword.aliases?.forEach((alias) => aliases.add(normalizePhrase(alias)));
    definitions.set(canonical, aliases);
    weights.push({ term: canonical, area, weight: keyword.weight });
  }
}

const dictionary: DictionaryEntry[] = [...definitions].map(([canonical, aliases]) => ({
  canonical,
  aliases: [...aliases].filter((alias) => alias !== canonical),
}));
const extractor = new KeywordExtractorService();
const dictionaryReport = extractor.loadDictionary(dictionary);
const softwareKeywords =
  'javascript typescript node.js react angular desarrollo de software arquitectura de software java python sql postgresql api rest c++ c# spring boot backend frontend git';

const profiles = [
  { name: 'alias corto JS', text: 'JS', expected: { 'software-development': 5 } },
  { name: 'canónica JavaScript', text: 'JavaScript', expected: { 'software-development': 5 } },
  {
    name: 'keyword canónica de varias palabras',
    text: 'desarrollo de software',
    expected: { 'software-development': 5 },
  },
  { name: 'alias de varias palabras', text: 'rest api', expected: { 'software-development': 4 } },
  { name: 'alias ML', text: 'ML', expected: { 'data-ai': 5 } },
  {
    name: 'frecuencia limitada a tres',
    text: 'javascript javascript javascript javascript javascript',
    expected: { 'software-development': 15 },
  },
  {
    name: 'saturación del puntaje a cien',
    text: `${softwareKeywords} ${softwareKeywords} ${softwareKeywords}`,
    expected: { 'software-development': 100, 'cloud-devops': 6, 'data-ai': 33 },
  },
  { name: 'perfil sin keywords', text: '', expected: {} },
  {
    name: 'Node.js no se confunde con JavaScript',
    text: 'Node.js',
    expected: { 'software-development': 5 },
  },
  {
    name: 'Node.js y JavaScript son keywords independientes',
    text: 'Node.js JavaScript',
    expected: { 'software-development': 10 },
  },
  {
    name: 'Python aporta con su peso propio a cada área',
    text: 'Python',
    expected: { 'software-development': 3, 'data-ai': 4 },
  },
  {
    name: 'Git aporta de manera independiente a dos áreas',
    text: 'Git',
    expected: { 'software-development': 2, 'cloud-devops': 2 },
  },
  {
    name: 'lista top ordenada y limitada a cinco keywords',
    text: 'javascript typescript node.js react angular java',
    expected: { 'software-development': 28 },
  },
] as const;

describe('criterios de aceptación de perfiles con el diccionario real', () => {
  it('construye el diccionario de 89 claves normalizadas del seed (canónicas y aliases)', () => {
    expect(dictionaryReport.loaded).toBe(89);
  });

  it.each(profiles)('$name', ({ text, expected }) => {
    const extracted = extractor.extract(text);
    const scores = calculateAffinity(extracted.keywords, weights);
    const actual = Object.fromEntries(
      scores.filter(({ score }) => score > 0).map(({ area, score }) => [area, score]),
    );

    expect(actual).toEqual(expected);
    expect(
      scores.every(
        ({ score, percentage }) =>
          score >= 0 &&
          score <= 100 &&
          percentage >= 0 &&
          percentage <= 100 &&
          Math.round(percentage * 100) / 100 === percentage,
      ),
    ).toBe(true);
  });

  it('devuelve porcentaje con precisión de dos decimales y el máximo peso reconocido', () => {
    const extracted = extractor.extract('JavaScript');
    const software = calculateAffinity(extracted.keywords, weights).find(
      ({ area }) => area === 'software-development',
    );

    expect(software).toMatchObject({ score: 5, percentage: 2.38, weighting: 5 });
  });

  it('devuelve el mayor peso reconocido por área y null si no hay coincidencias', () => {
    const extracted = extractor.extract('Python');
    const scores = calculateAffinity(extracted.keywords, weights);

    expect(scores.find(({ area }) => area === 'software-development')?.weighting).toBe(3);
    expect(scores.find(({ area }) => area === 'data-ai')?.weighting).toBe(4);
    expect(scores.find(({ area }) => area === 'quality-assurance')?.weighting).toBeNull();
  });

  it('conserva top keywords por aporte y limita la lista a cinco', () => {
    const extracted = extractor.extract(profiles[12].text);
    const software = calculateAffinity(extracted.keywords, weights).find(
      ({ area }) => area === 'software-development',
    );

    expect(software?.topKeywords).toHaveLength(5);
    expect(software?.topKeywords.map(({ term }) => term)).toEqual([
      'javascript',
      'node.js',
      'react',
      'typescript',
      'angular',
    ]);
  });

  it('no genera puntaje para texto sin correspondencia en el diccionario', () => {
    const extracted = extractor.extract('xylophone');
    const scores = calculateAffinity(extracted.keywords, weights);

    expect(extracted.unmapped).toContainEqual({ term: 'xylophone', count: 1 });
    expect(scores.every(({ score }) => score === 0)).toBe(true);
  });
});

interface CandidateEvaluation {
  canonical: string;
  meaning: string;
  ambiguities: string;
  aliases: string[];
  proposedWeights: { area: RadarArea; weight: number }[];
}

function compareProfilesBeforeAndAfter(
  profileList: readonly { id: string; name: string; text: string }[],
  candidate: CandidateEvaluation,
) {
  const canonical = normalizePhrase(candidate.canonical);
  const candidateAliases = candidate.aliases.map((alias) => normalizePhrase(alias));

  const nextDictionary: DictionaryEntry[] = [
    ...dictionary,
    { canonical, aliases: candidateAliases.filter((alias) => alias !== canonical) },
  ];
  const nextWeights: KeywordAreaWeight[] = [
    ...weights,
    ...candidate.proposedWeights.map(({ area, weight }) => ({
      term: canonical,
      area,
      weight,
    })),
  ];

  const beforeExtractor = new KeywordExtractorService();
  beforeExtractor.loadDictionary(dictionary);

  const afterExtractor = new KeywordExtractorService();
  afterExtractor.loadDictionary(nextDictionary);

  return profileList.map((profile) => {
    const beforeExtracted = beforeExtractor.extract(profile.text);
    const beforeScores = calculateAffinity(beforeExtracted.keywords, weights);

    const afterExtracted = afterExtractor.extract(profile.text);
    const afterScores = calculateAffinity(afterExtracted.keywords, nextWeights);

    const scoreDiffs = afterScores
      .map((afterArea) => {
        const beforeArea = beforeScores.find((item) => item.area === afterArea.area)!;
        const deltaScore = afterArea.score - beforeArea.score;
        const deltaPercentage =
          Math.round((afterArea.percentage - beforeArea.percentage) * 100) / 100;
        return {
          area: afterArea.area,
          beforeScore: beforeArea.score,
          afterScore: afterArea.score,
          beforePercentage: beforeArea.percentage,
          afterPercentage: afterArea.percentage,
          deltaScore,
          deltaPercentage,
        };
      })
      .filter((diff) => Math.abs(diff.deltaScore) > 0.01);

    return {
      id: profile.id,
      name: profile.name,
      beforeUnmapped: beforeExtracted.unmapped,
      afterUnmapped: afterExtracted.unmapped,
      afterKeywords: afterExtracted.keywords,
      changedScore: scoreDiffs.length > 0,
      scoreDiffs,
    };
  });
}

describe('HU-15 · T15.2: comparación antes y después con perfiles de referencia (P1 a P13)', () => {
  const openTelemetryCandidate: CandidateEvaluation = {
    canonical: 'OpenTelemetry',
    meaning:
      'Estándar de observabilidad para instrumentación de trazas, métricas y logs en sistemas distribuidos',
    ambiguities: 'Sin ambigüedad con términos generales ni colisión entre ejes',
    aliases: ['otel'],
    proposedWeights: [{ area: 'cloud-devops', weight: 3 }],
  };

  const referenceProfilesWithIds = profiles.map((profile, index) => ({
    id: `P${index + 1}`,
    name: profile.name,
    text: profile.text,
  }));

  it('CA-HU15-02: registra la evaluación completa del término candidato (significado, ambigüedades, alias, áreas y pesos)', () => {
    expect(openTelemetryCandidate.canonical).toBe('OpenTelemetry');
    expect(openTelemetryCandidate.meaning.length).toBeGreaterThan(10);
    expect(openTelemetryCandidate.ambiguities.length).toBeGreaterThan(5);
    expect(openTelemetryCandidate.aliases).toContain('otel');
    expect(openTelemetryCandidate.proposedWeights).toEqual([
      { area: 'cloud-devops', weight: 3 },
    ]);
  });

  it('CA-HU15-03 y CA-HU15-04: P1 a P13 conservan sus puntajes con tolerancia 0,01 tras incorporar un término nuevo', () => {
    const comparison = compareProfilesBeforeAndAfter(
      referenceProfilesWithIds,
      openTelemetryCandidate,
    );

    expect(comparison).toHaveLength(13);
    expect(comparison.filter((item) => item.changedScore)).toEqual([]);
  });

  it('CA-HU15-03 y CA-HU15-04: identifica y explica el perfil que contiene el candidato aprobado y sus alias', () => {
    const evaluationSuite = [
      ...referenceProfilesWithIds,
      {
        id: 'PC-01',
        name: 'perfil con candidato OpenTelemetry y alias otel',
        text: 'OpenTelemetry y otel en Kubernetes',
      },
    ];

    const comparison = compareProfilesBeforeAndAfter(
      evaluationSuite,
      openTelemetryCandidate,
    );
    const changedProfiles = comparison.filter((item) => item.changedScore);

    expect(changedProfiles).toHaveLength(1);
    expect(changedProfiles[0].id).toBe('PC-01');
    expect(changedProfiles[0].beforeUnmapped).toEqual([
      { term: 'opentelemetry', count: 1 },
      { term: 'otel', count: 1 },
    ]);
    expect(changedProfiles[0].afterUnmapped).toEqual([]);
    expect(changedProfiles[0].afterKeywords).toContainEqual({
      term: 'opentelemetry',
      count: 2,
    });
    expect(changedProfiles[0].scoreDiffs).toEqual([
      {
        area: 'cloud-devops',
        beforeScore: 5,
        afterScore: 11,
        beforePercentage: 3.03,
        afterPercentage: 6.32,
        deltaScore: 6,
        deltaPercentage: 3.29,
      },
    ]);
  });
});
