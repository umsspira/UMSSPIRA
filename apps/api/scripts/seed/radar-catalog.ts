import { normalizePhrase } from '../../src/modules/nlp/domain/policies/text-normalizer';
import { RADAR_DICTIONARY } from '../../src/modules/radar/domain/affinity-catalog';
import { RADAR_AREA_IDS, type RadarArea } from '../../src/modules/radar/domain/entities/radar-area';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { DICTIONARY_VERSION } from '../../src/modules/radar/domain/policies/affinity-config';
import { getRadarDictionaryFingerprint } from './radar-dictionary-version';
export { RADAR_DICTIONARY } from '../../src/modules/radar/domain/affinity-catalog';

export function validateRadarDictionary(): void {
  const canonical = new Set<string>();
  const aliases = new Map<string, string>();

  for (const [area, definitions] of Object.entries(RADAR_DICTIONARY)) {
    if (!(area in RADAR_AREA_IDS)) {
      throw new Error(`Área de radar desconocida: ${area}`);
    }
    if (definitions.length < 8) {
      throw new Error(`El área ${area} tiene menos de 8 keywords`);
    }

    const local = new Set<string>();

    for (const definition of definitions) {
      const term = normalizePhrase(definition.term);
      const wordCount = term.split(' ').length;

      if (!term || wordCount > 3) {
        throw new Error(`Keyword inválida: ${definition.term}`);
      }
      if (!Number.isInteger(definition.weight) || definition.weight < 1 || definition.weight > 5) {
        throw new Error(`Peso inválido: ${definition.term}`);
      }
      if (local.has(term)) {
        throw new Error(`Keyword duplicada en ${area}: ${term}`);
      }

      local.add(term);
      canonical.add(term);

      for (const alias of definition.aliases ?? []) {
        const normalized = normalizePhrase(alias);

        if (!normalized || normalized.split(' ').length > 3) {
          throw new Error(`Alias inválido: ${alias}`);
        }
        if (normalized === term) {
          throw new Error(`Alias redundante: ${alias}`);
        }

        const owner = aliases.get(normalized);
        if (owner && owner !== term) {
          throw new Error(`Alias conflictivo: ${alias}`);
        }
        aliases.set(normalized, term);
      }
    }
  }

  for (const [alias, owner] of aliases) {
    if (canonical.has(alias) && alias !== owner) {
      throw new Error(`Alias ${alias} coincide con otra keyword canónica`);
    }
  }
}

function compareDictionaryVersions(a: string, b: string): number {
  const pattern = /^(\d{4})-(\d{2})-(\d{2})\.(\d+)$/;

  const matchA = pattern.exec(a);
  const matchB = pattern.exec(b);

  if (!matchA || !matchB) {
    throw new Error(`Formato de versión de diccionario inválido: ${a} / ${b}`);
  }

  const partsA = matchA.slice(1).map(Number);
  const partsB = matchB.slice(1).map(Number);

  for (let i = 0; i < partsA.length; i++) {
    if (partsA[i] !== partsB[i]) {
      return partsA[i] > partsB[i] ? 1 : -1;
    }
  }

  return 0;
}

export async function seedRadarCatalog(prisma: PrismaClient): Promise<void> {
  validateRadarDictionary();

  const fingerprint = getRadarDictionaryFingerprint();

  await prisma.$transaction(
    async (tx) => {
      // T15.3: Serializar publicaciones del diccionario Radar.
      // El bloqueo se libera automáticamente al finalizar la transacción.
       await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(15320261116)
      `;
      // T15.3: Consultar versiones publicadas.
      const publishedVersions = await tx.radarDiccionarioVersion.findMany({
        select: {
          version: true,
          fingerprint: true,
        },
      });

      // Impedir que una versión antigua se ejecute
      // si ya existe una publicación más reciente.
      for (const published of publishedVersions) {
        if (compareDictionaryVersions(DICTIONARY_VERSION, published.version) < 0) {
          throw new Error(
            `No se puede publicar ${DICTIONARY_VERSION}: existe la versión ${published.version}`,
          );
        }
      }

      const existing = publishedVersions.find(
        (item) => item.version === DICTIONARY_VERSION,
      );

      // Una versión existente debe conservar su contenido original.
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw new Error(
            `La versión ${DICTIONARY_VERSION} ya fue publicada con otro contenido`,
          );
        }

        // Misma versión y mismo contenido: publicación idempotente.
        return;
      }
      const definitions = new Map<
        string,
        { name: string; aliases: Set<string>; areas: Map<string, number> }
      >();

      for (const [area, keywords] of Object.entries(RADAR_DICTIONARY)) {
        const areaId = RADAR_AREA_IDS[area as RadarArea];

        for (const keyword of keywords) {
          const normalized = normalizePhrase(keyword.term);
          let definition = definitions.get(normalized);

          if (!definition) {
            definition = {
              name: keyword.term,
              aliases: new Set<string>([normalized]),
              areas: new Map<string, number>(),
            };
            definitions.set(normalized, definition);
          }

          definition.areas.set(areaId, keyword.weight);

          for (const alias of keyword.aliases ?? []) {
            definition.aliases.add(normalizePhrase(alias));
          }
        }
      }

      const terms = [...definitions.keys()];
      const aliasTerms = [
        ...new Set([...definitions.values()].flatMap((definition) => [...definition.aliases])),
      ];

      // Comprobar conflictos antes de escribir.
      const existingKeywords = await tx.palabraClave.findMany({
        where: {
          termino_normalizado: { in: [...new Set([...terms, ...aliasTerms])] },
        },
        select: { id: true, termino_normalizado: true },
      });

      const existingAliases = await tx.aliasPalabraClave.findMany({
        where: {
          alias_normalizado: { in: [...new Set([...terms, ...aliasTerms])] },
        },
        select: {
          alias_normalizado: true,
          id_palabra_clave: true,
          palabra_clave: {
            select: { termino_normalizado: true },
          },
        },
      });

      const keywordByTerm = new Map(
        existingKeywords.map((keyword) => [keyword.termino_normalizado, keyword]),
      );

      for (const alias of existingAliases) {
        const owner = alias.palabra_clave.termino_normalizado;

        if (definitions.has(alias.alias_normalizado) && alias.alias_normalizado !== owner) {
          throw new Error(`El término ${alias.alias_normalizado} ya es alias de ${owner}`);
        }
      }

      for (const [term, definition] of definitions) {
        for (const alias of definition.aliases) {
          const canonicalConflict = keywordByTerm.get(alias);

          if (canonicalConflict && alias !== term) {
            throw new Error(`El alias ${alias} ya existe como palabra canónica`);
          }

          const existingAlias = existingAliases.find(
            (record) => record.alias_normalizado === alias,
          );

          if (existingAlias && existingAlias.palabra_clave.termino_normalizado !== term) {
            throw new Error(`El alias ${alias} pertenece a otra palabra clave`);
          }
        }
      }

      // Crear o reutilizar keywords, alias y asociaciones.
      for (const [term, definition] of definitions) {
        const keyword = await tx.palabraClave.upsert({
          where: { termino_normalizado: term },
          create: {
            nombre: definition.name,
            termino_normalizado: term,
            esta_activo: true,
          },
          update: {},
        });

        for (const alias of definition.aliases) {
          await tx.aliasPalabraClave.upsert({
            where: { alias_normalizado: alias },
            create: {
              id_palabra_clave: keyword.id,
              alias,
              alias_normalizado: alias,
            },
            update: {},
          });
        }

        for (const [areaId, weight] of definition.areas) {
          await tx.palabraClaveArea.upsert({
            where: {
              id_palabra_clave_id_area: {
                id_palabra_clave: keyword.id,
                id_area: areaId,
              },
            },
            create: {
              id_palabra_clave: keyword.id,
              id_area: areaId,
              peso: weight,
            },
            update: { peso: weight },
          });
        }
      }

      // T15.3: Registrar la versión solo después de aplicar el catálogo.
      await tx.radarDiccionarioVersion.create({
        data: {
          version: DICTIONARY_VERSION,
          fingerprint,
          descripcion: 'Publicación del diccionario Radar mediante seed versionado',
        },
      });
    },
    {
      timeout: 120000,
      maxWait: 10000,
    },
  );
}