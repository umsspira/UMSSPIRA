import {
  ALGORITHM_VERSION,
  compareRequirements,
  type RequirementMatchResult,
} from '../src/modules/job-postings/domain/policies/requirement-similarity';
import { KeywordExtractorService } from '../src/modules/nlp/application/services/keyword-extractor.service';
import type { DictionaryEntry } from '../src/modules/nlp/domain/entities/dictionary-entry';
import { normalizePhrase } from '../src/modules/nlp/domain/policies/text-normalizer';
import { RADAR_DICTIONARY } from '../src/modules/radar/domain/affinity-catalog';

/**
 * HU-11 · Conjunto de calidad del motor vacante-perfil con el diccionario real del seed
 * (el mismo de test/affinity-profiles.spec.ts, perfiles P1-P13).
 *
 * Métrica declarada: al menos el 90 % de los requisitos debe clasificarse como se espera
 * (exacta, parcial o sin coincidencia). Ver apps/api/docs/endpoints/epic5/HU11-similitud-avanzada.md.
 */
export const MIN_QUALITY_ACCURACY = 0.9;

const definitions = new Map<string, Set<string>>();
for (const keywords of Object.values(RADAR_DICTIONARY)) {
  for (const keyword of keywords) {
    const canonical = normalizePhrase(keyword.term);
    const aliases = definitions.get(canonical) ?? new Set<string>();
    keyword.aliases?.forEach((alias) => aliases.add(normalizePhrase(alias)));
    definitions.set(canonical, aliases);
  }
}
const dictionary: DictionaryEntry[] = [...definitions].map(([canonical, aliases]) => ({
  canonical,
  aliases: [...aliases].filter((alias) => alias !== canonical),
}));
const extractor = new KeywordExtractorService();
extractor.loadDictionary(dictionary);

interface QualityCase {
  id: string;
  profile: string[];
  requirements: Array<[string, RequirementMatchResult]>;
}

const cases: QualityCase[] = [
  {
    id: 'Q1 alias cortos (P1 JS)',
    profile: ['Desarrollador JavaScript y TypeScript'],
    requirements: [
      ['JS', 'exact'],
      ['TS', 'exact'],
    ],
  },
  {
    id: 'Q2 alias dentro de la canónica (Postgres / PostgreSQL)',
    profile: ['Administré bases en PostgreSQL'],
    requirements: [['Postgres', 'exact']],
  },
  {
    id: 'Q3 varias palabras y alias (P3, P4)',
    profile: ['Diseño de API REST', 'Experiencia en desarrollo de software'],
    requirements: [
      ['RESTful', 'exact'],
      ['Desarrollo de software', 'exact'],
    ],
  },
  {
    id: 'Q4 alias de varias palabras',
    profile: ['Certificación Amazon Web Services'],
    requirements: [['AWS', 'exact']],
  },
  {
    id: 'Q5 Node.js no es JavaScript (P9)',
    profile: ['Backend con Node.js'],
    requirements: [
      ['JavaScript', 'not-found'],
      ['Node', 'exact'],
    ],
  },
  {
    id: 'Q6 Java no es JavaScript (no hay substring)',
    profile: ['Frontend con JavaScript'],
    requirements: [['Java', 'not-found']],
  },
  {
    id: 'Q7 variantes de número y género fuera del diccionario',
    profile: ['Modelado de base de datos relacional'],
    requirements: [['Bases de datos relacionales', 'exact']],
  },
  {
    id: 'Q8 requisito más específico que el perfil',
    profile: ['Aplicaciones con React'],
    requirements: [
      ['React Native', 'similar'],
      ['ReactJS', 'exact'],
    ],
  },
  {
    id: 'Q9 cobertura parcial de palabras',
    profile: ['Escribí pruebas automatizadas con Cypress'],
    requirements: [
      ['Pruebas automatizadas end to end', 'similar'],
      ['Cypress', 'exact'],
      ['Selenium', 'not-found'],
    ],
  },
  {
    id: 'Q10 sinónimos en español (IA, ágil)',
    profile: ['Proyecto de inteligencia artificial', 'Trabajo con metodologías ágiles'],
    requirements: [
      ['IA', 'exact'],
      ['Agile', 'exact'],
      ['Scrum', 'not-found'],
    ],
  },
  {
    id: 'Q11 Kubernetes por alias k8s y DevOps parcial',
    profile: ['Despliegues en k8s y Docker'],
    requirements: [
      ['Kubernetes', 'exact'],
      ['Docker Compose', 'similar'],
      ['Terraform', 'not-found'],
    ],
  },
  {
    id: 'Q12 seguridad: alias de varias palabras',
    profile: ['Curso de seguridad informática', 'Pruebas de penetración en redes'],
    requirements: [
      ['Ciberseguridad', 'exact'],
      ['Pentesting', 'exact'],
    ],
  },
  {
    id: 'Q13 perfil vacío',
    profile: [],
    requirements: [
      ['Python', 'not-found'],
      ['SQL', 'not-found'],
    ],
  },
];

describe(`calidad del motor de similitud (${ALGORITHM_VERSION})`, () => {
  const rows = cases.flatMap(({ id, profile, requirements }) => {
    const outcome = compareRequirements(
      requirements.map(([requirement]) => requirement),
      profile,
      extractor,
    );
    return requirements.map(([requirement, expected], index) => ({
      id,
      requirement,
      expected,
      actual: outcome.comparison[index]?.result,
    }));
  });

  it.each(rows)('$id · $requirement → $expected', ({ expected, actual }) => {
    expect(actual).toBe(expected);
  });

  it(`acierta al menos el ${MIN_QUALITY_ACCURACY * 100} % del conjunto`, () => {
    const hits = rows.filter(({ expected, actual }) => expected === actual).length;
    expect(hits / rows.length).toBeGreaterThanOrEqual(MIN_QUALITY_ACCURACY);
  });
});
