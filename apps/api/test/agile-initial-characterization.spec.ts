import { KeywordExtractorService } from '../src/modules/nlp/application/services/keyword-extractor.service';
import { mapKeywordsToAreas } from '../src/modules/nlp/application/services/keyword-area-mapper';
import type {
  DictionaryAreaAssociation,
  DictionaryEntry,
} from '../src/modules/nlp/domain/entities/dictionary-entry';
import { normalizePhrase } from '../src/modules/nlp/domain/policies/text-normalizer';
import { RADAR_DICTIONARY } from '../src/modules/radar/domain/affinity-catalog';
import { calculateAreaAffinity } from '../src/modules/radar/domain/policies/affinity-calculator';
import { CURRENT_PROFILE_DESCRIPTION_ORDER } from '../src/modules/radar/domain/policies/profile-description-order';
import { RADAR_AREA_IDS, type RadarArea } from '../src/modules/radar/domain/entities/radar-area';
import { PrismaProfileTextReaderAdapter } from '../src/modules/radar/infrastructure/adapters/prisma-profile-text-reader.adapter';
import type { PrismaService } from '../src/shared/infrastructure/database/prisma.service';

interface AreaOutcome {
  points: number;
  percentage: number;
}

interface DictionaryFixture {
  entries: DictionaryEntry[];
  areasByKeyword: Map<string, DictionaryAreaAssociation[]>;
}

const AREAS = Object.keys(RADAR_AREA_IDS) as RadarArea[];

/**
 * Construye el diccionario productivo a partir del catálogo que alimenta el seed.
 * El catálogo es la fuente de verdad de los pesos; la base replica esos valores.
 */
function buildDictionary(): DictionaryFixture {
  const definitions = new Map<
    string,
    { aliases: Set<string>; areas: Map<string, { nombre: string | null; peso: number }> }
  >();

  for (const area of AREAS) {
    const areaId = RADAR_AREA_IDS[area];

    for (const keyword of RADAR_DICTIONARY[area]) {
      const canonical = normalizePhrase(keyword.term);
      const definition = definitions.get(canonical) ?? {
        aliases: new Set<string>(),
        areas: new Map<string, { nombre: string | null; peso: number }>(),
      };

      definition.areas.set(areaId, { nombre: area, peso: keyword.weight });
      for (const alias of keyword.aliases ?? []) {
        definition.aliases.add(normalizePhrase(alias));
      }
      definitions.set(canonical, definition);
    }
  }

  const entries: DictionaryEntry[] = [];
  const areasByKeyword = new Map<string, DictionaryAreaAssociation[]>();

  for (const [canonical, definition] of definitions) {
    const areas = [...definition.areas].map(([id, { nombre, peso }]) => ({ id, nombre, peso }));
    entries.push({ canonical, aliases: [...definition.aliases], areas });
    areasByKeyword.set(canonical, areas);
    for (const alias of definition.aliases) {
      areasByKeyword.set(alias, areas);
    }
  }

  return { entries, areasByKeyword };
}

const dictionary = buildDictionary();

function calculate(texts: readonly string[]): Record<RadarArea, AreaOutcome> {
  const extractor = new KeywordExtractorService();
  extractor.loadDictionary(dictionary.entries);

  const { keywords } = extractor.extract(texts.join('\n'));
  const grouped = new Map<RadarArea, Array<{ term: string; peso: number }>>();

  for (const association of mapKeywordsToAreas(keywords, dictionary.areasByKeyword)) {
    const current = grouped.get(association.area) ?? [];
    current.push({ term: association.term, peso: association.weight });
    grouped.set(association.area, current);
  }

  const outcomes = {} as Record<RadarArea, AreaOutcome>;
  for (const area of AREAS) {
    const result = calculateAreaAffinity(keywords, grouped.get(area) ?? []);
    outcomes[area] = { points: result.puntaje, percentage: result.porcentaje };
  }
  return outcomes;
}

function expectOnlyItManagement(outcomes: Record<RadarArea, AreaOutcome>): void {
  expect(outcomes['it-management'].points).toBe(4);
  expect(outcomes['it-management'].percentage).toBeCloseTo(10, 2);

  for (const area of AREAS.filter((candidate) => candidate !== 'it-management')) {
    expect(outcomes[area].points).toBe(0);
    expect(outcomes[area].percentage).toBeCloseTo(0, 2);
  }
}

describe('HU-9 CA-05 - origen del Agile inicial', () => {
  it('un Agile en la descripción profesional aporta 10 % a Gestión TI y nada al resto', () => {
    expectOnlyItManagement(
      calculate(['Metodologías ágiles y gestión del alcance, tiempo y costo.']),
    );
  });

  it('un Agile en el título de formación aporta 10 % a Gestión TI y nada al resto', () => {
    expectOnlyItManagement(calculate(['Agile Coach']));
  });

  it('un Agile en el cargo de experiencia aporta 10 % a Gestión TI y nada al resto', () => {
    expectOnlyItManagement(calculate(['Agile Coach']));
  });

  it('un Agile en el nombre de la certificación aporta 10 % a Gestión TI y nada al resto', () => {
    expectOnlyItManagement(calculate(['Agile Certified Professional']));
  });

  it('un perfil sin Agile en ninguna fuente deja Gestión TI en cero', () => {
    const outcomes = calculate(['ingeniero en sistemas']);

    for (const area of AREAS) {
      expect(outcomes[area].points).toBe(0);
      expect(outcomes[area].percentage).toBeCloseTo(0, 2);
    }
  });

  it('caracteriza las dos filas de perfil_area: la histórica sumaba Agile y la vigente no', () => {
    // Caracterización: en esta rama apilada ya está aplicada la regla de descripción
    // vigente de T9.4. La prueba documenta la diferencia entre leer todas las filas
    // (comportamiento que produjo el Agile inicial) y leer solo la fila vigente.
    // Si T9.4 cambia el criterio de vigencia, esta prueba debe actualizarse.
    const currentDescription = 'ingeniero en sistemas';
    const historicalDescription = 'Metodologías ágiles y gestión del alcance, tiempo y costo.';

    expectOnlyItManagement(calculate([currentDescription, historicalDescription]));
    expect(calculate([currentDescription])['it-management'].percentage).toBeCloseTo(0, 2);
  });

  it('el lector productivo de perfil consulta solo la descripción vigente', async () => {
    const findFirst = jest.fn().mockResolvedValue({ descripcion_profesional: 'ingeniero en sistemas' });
    const prisma = {
      formacionAcademica: { findMany: jest.fn().mockResolvedValue([]) },
      experienciaLaboral: { findMany: jest.fn().mockResolvedValue([]) },
      certificacion: { findMany: jest.fn().mockResolvedValue([]) },
      perfilArea: { findFirst },
    } as unknown as PrismaService;

    const reader = new PrismaProfileTextReaderAdapter(prisma);
    const result = await reader.getProfileTexts('00000000-0000-4000-8000-000000000000');

    expect(result.texts).toEqual(['ingeniero en sistemas']);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: CURRENT_PROFILE_DESCRIPTION_ORDER }),
    );
  });

  it('la certificación AWS de referencia aporta 35 % a Cloud/DevOps y nada al resto', () => {
    const outcomes = calculate([
      'AWS Certified Solutions Architect – Associate',
      'Amazon Web Services',
    ]);

    expect(outcomes['cloud-devops'].points).toBe(14);
    expect(outcomes['cloud-devops'].percentage).toBeCloseTo(35, 2);

    for (const area of AREAS.filter((candidate) => candidate !== 'cloud-devops')) {
      expect(outcomes[area].points).toBe(0);
      expect(outcomes[area].percentage).toBeCloseTo(0, 2);
    }
  });
});
