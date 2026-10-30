import { normalizePhrase } from '../../src/modules/nlp/domain/policies/text-normalizer';
import { RADAR_DICTIONARY } from '../../src/modules/radar/domain/affinity-catalog';
import { RADAR_AREA_IDS, type RadarArea } from '../../src/modules/radar/domain/entities/radar-area';
import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
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

export async function seedRadarCatalog(prisma: PrismaClient): Promise<void> {
  validateRadarDictionary();

  await prisma.$transaction(
    async (tx) => {
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

      // Insertar por lotes evita cientos de viajes a PostgreSQL remoto.
      const missingKeywords = [...definitions]
        .filter(([term]) => !keywordByTerm.has(term))
        .map(([term, definition]) => ({
          nombre: definition.name,
          termino_normalizado: term,
          esta_activo: true,
        }));
      if (missingKeywords.length > 0) {
        await tx.palabraClave.createMany({ data: missingKeywords, skipDuplicates: true });
        const keywords = await tx.palabraClave.findMany({
          where: { termino_normalizado: { in: terms } },
          select: { id: true, termino_normalizado: true },
        });
        for (const keyword of keywords) {
          keywordByTerm.set(keyword.termino_normalizado, keyword);
        }
      }

      const knownAliases = new Set(existingAliases.map((alias) => alias.alias_normalizado));
      const missingAliases: Prisma.AliasPalabraClaveCreateManyInput[] = [];
      const requestedWeights: Prisma.PalabraClaveAreaCreateManyInput[] = [];
      for (const [term, definition] of definitions) {
        const keyword = keywordByTerm.get(term);
        if (!keyword) {
          throw new Error(`No se pudo preparar la palabra clave ${term}`);
        }
        for (const alias of definition.aliases) {
          if (!knownAliases.has(alias)) {
            missingAliases.push({
              id_palabra_clave: keyword.id,
              alias,
              alias_normalizado: alias,
            });
          }
        }
        for (const [areaId, weight] of definition.areas) {
          requestedWeights.push({
            id_palabra_clave: keyword.id,
            id_area: areaId,
            peso: weight,
          });
        }
      }
      if (missingAliases.length > 0) {
        await tx.aliasPalabraClave.createMany({ data: missingAliases, skipDuplicates: true });
      }

      const existingWeights = await tx.palabraClaveArea.findMany({
        where: {
          id_palabra_clave: {
            in: [...definitions.keys()].map((term) => keywordByTerm.get(term)!.id),
          },
          id_area: { in: Object.values(RADAR_AREA_IDS) },
        },
        select: { id_palabra_clave: true, id_area: true, peso: true },
      });
      const weightByPair = new Map(
        existingWeights.map((weight) => [`${weight.id_palabra_clave}:${weight.id_area}`, weight]),
      );
      const missingWeights = requestedWeights.filter(
        (weight) => !weightByPair.has(`${weight.id_palabra_clave}:${weight.id_area}`),
      );
      if (missingWeights.length > 0) {
        await tx.palabraClaveArea.createMany({ data: missingWeights, skipDuplicates: true });
      }
      for (const weight of requestedWeights) {
        const existing = weightByPair.get(`${weight.id_palabra_clave}:${weight.id_area}`);
        if (existing && Number(existing.peso) !== Number(weight.peso)) {
          await tx.palabraClaveArea.update({
            where: {
              id_palabra_clave_id_area: {
                id_palabra_clave: weight.id_palabra_clave,
                id_area: weight.id_area,
              },
            },
            data: { peso: weight.peso },
          });
        }
      }
    },
    {
      timeout: 120000,
      maxWait: 15000,
    },
  );
}
