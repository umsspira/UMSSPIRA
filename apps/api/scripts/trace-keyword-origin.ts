import { createDatabaseClient } from './database-client';
import { KeywordExtractorService } from '../src/modules/nlp/application/services/keyword-extractor.service';
import { mapKeywordsToAreas } from '../src/modules/nlp/application/services/keyword-area-mapper';
import type {
  DictionaryAreaAssociation,
  DictionaryEntry,
} from '../src/modules/nlp/domain/entities/dictionary-entry';
import type { ExtractedKeyword } from '../src/modules/nlp/domain/entities/extracted-keyword';
import { calculateAreaAffinity } from '../src/modules/radar/domain/policies/affinity-calculator';
import { calculateInputHash } from '../src/modules/radar/domain/policies/input-hash';
import { CURRENT_PROFILE_DESCRIPTION_ORDER } from '../src/modules/radar/domain/policies/profile-description-order';
import { RADAR_AREA_IDS, type RadarArea } from '../src/modules/radar/domain/entities/radar-area';
import type { Prisma } from '../src/generated/prisma/client';

/**
 * Rastrea el origen de una palabra clave en el perfil de un titulado y reproduce
 * el cálculo del radar con el extractor y el calculador productivos.
 *
 * Solo lectura: todas las consultas se ejecutan dentro de una transacción
 * PostgreSQL marcada como READ ONLY. El script nunca imprime la cadena de
 * conexión ni datos personales (nombres o correos).
 *
 * Variables de entorno:
 * - TITULADO_ID (obligatoria): UUID del titulado a revisar.
 * - KEYWORD (opcional): término canónico a rastrear. Por defecto "agile".
 *
 * Ejemplo:
 *   TITULADO_ID=00000000-0000-4000-8000-000000000000 \
 *     pnpm --filter api exec tsx scripts/trace-keyword-origin.ts
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SourceField {
  source: 'descripcion' | 'formacion' | 'experiencia' | 'certificacion';
  table: string;
  rowId: string;
  field: string;
  text: string;
}

interface AreaResult {
  area: RadarArea;
  areaId: string;
  points: number;
  percentage: number;
  keywords: Array<{ keyword: string; weight: number; frequency: number; points: number }>;
}

function readRequiredId(): string {
  const value = process.env.TITULADO_ID?.trim();
  if (!value) {
    throw new Error('Falta TITULADO_ID');
  }
  if (!UUID_PATTERN.test(value)) {
    throw new Error('TITULADO_ID no tiene formato UUID');
  }
  return value;
}

function readKeyword(): string {
  const value = process.env.KEYWORD?.trim().toLowerCase();
  return value && value.length > 0 ? value : 'agile';
}

function groupWeightsByArea(
  keywords: readonly ExtractedKeyword[],
  areasByKeyword: ReadonlyMap<string, readonly DictionaryAreaAssociation[]>,
): Map<RadarArea, Array<{ term: string; peso: number }>> {
  const grouped = new Map<RadarArea, Array<{ term: string; peso: number }>>();

  for (const association of mapKeywordsToAreas(keywords, areasByKeyword)) {
    const current = grouped.get(association.area) ?? [];
    current.push({ term: association.term, peso: association.weight });
    grouped.set(association.area, current);
  }

  return grouped;
}

function calculateAreas(
  keywords: readonly ExtractedKeyword[],
  areasByKeyword: ReadonlyMap<string, readonly DictionaryAreaAssociation[]>,
): AreaResult[] {
  const grouped = groupWeightsByArea(keywords, areasByKeyword);

  return (Object.keys(RADAR_AREA_IDS) as RadarArea[]).map((area) => {
    const result = calculateAreaAffinity([...keywords], grouped.get(area) ?? []);
    return {
      area,
      areaId: RADAR_AREA_IDS[area],
      points: result.puntaje,
      percentage: result.porcentaje,
      keywords: result.palabrasClaveTop.map(({ keyword, weight, frequency, points }) => ({
        keyword,
        weight,
        frequency,
        points,
      })),
    };
  });
}

function buildTexts(fields: readonly SourceField[]): string[] {
  return fields
    .map(({ text }) => text.trim())
    .filter((text) => text.length > 0);
}

function summarize(
  extractor: KeywordExtractorService,
  fields: readonly SourceField[],
  areasByKeyword: ReadonlyMap<string, readonly DictionaryAreaAssociation[]>,
  target: string,
) {
  const texts = buildTexts(fields);
  const extracted = extractor.extract(texts.join('\n'));
  const targetMatches = extracted.keywords.filter(({ term }) => term === target);
  const areas = calculateAreas(extracted.keywords, areasByKeyword);

  return {
    textCount: texts.length,
    hash: calculateInputHash(texts),
    targetCount: targetMatches.reduce((total, match) => total + match.count, 0),
    keywords: extracted.keywords,
    areas,
  };
}

async function main(): Promise<void> {
  const tituladoId = readRequiredId();
  const target = readKeyword();
  const prisma = createDatabaseClient();

  try {
    const report = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Garantía adicional: aunque el script solo usa findMany/findFirst,
        // la transacción rechaza cualquier escritura accidental.
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

        const [profileRows, educations, experiences, certifications, dictionaryRows, lastCalculation] =
          await Promise.all([
            tx.perfilArea.findMany({
              where: { id_titulado: tituladoId },
              orderBy: CURRENT_PROFILE_DESCRIPTION_ORDER,
              select: {
                id: true,
                descripcion_profesional: true,
                fecha_creacion: true,
                fecha_actualizacion: true,
              },
            }),
            tx.formacionAcademica.findMany({
              where: { id_titulado: tituladoId },
              orderBy: { id: 'asc' },
              select: { id: true, titulo: true, institucion: true },
            }),
            tx.experienciaLaboral.findMany({
              where: { id_titulado: tituladoId },
              orderBy: { id: 'asc' },
              select: { id: true, cargo: true, empresa: true },
            }),
            tx.certificacion.findMany({
              where: { id_titulado: tituladoId },
              orderBy: { id: 'asc' },
              select: { id: true, nombre: true, entidad_emisora: true },
            }),
            tx.palabraClave.findMany({
              where: { esta_activo: true },
              orderBy: { termino_normalizado: 'asc' },
              select: {
                termino_normalizado: true,
                alias_registros: { select: { alias_normalizado: true } },
                area_registros: {
                  select: { peso: true, area: { select: { id: true, nombre: true } } },
                },
              },
            }),
            tx.calculoRadar.findFirst({
              where: { id_titulado: tituladoId },
              orderBy: { fecha_calculo: 'desc' },
              include: {
                afinidad_registros: {
                  include: { area: { select: { id: true, nombre: true } } },
                },
              },
            }),
          ]);

        const entries: DictionaryEntry[] = dictionaryRows.map((row) => ({
          canonical: row.termino_normalizado,
          aliases: row.alias_registros.map(({ alias_normalizado }) => alias_normalizado),
          areas: row.area_registros.map((association) => ({
            id: association.area.id,
            nombre: association.area.nombre,
            peso: association.peso,
          })),
        }));

        const extractor = new KeywordExtractorService();
        const loadReport = extractor.loadDictionary(entries);

        const areasByKeyword = new Map<string, DictionaryAreaAssociation[]>();
        for (const entry of entries) {
          areasByKeyword.set(entry.canonical, entry.areas ?? []);
          for (const alias of entry.aliases) {
            areasByKeyword.set(alias, entry.areas ?? []);
          }
        }

        const fields: SourceField[] = [];
        for (const row of educations) {
          fields.push({ source: 'formacion', table: 'formacion_academica', rowId: row.id, field: 'titulo', text: row.titulo });
          fields.push({ source: 'formacion', table: 'formacion_academica', rowId: row.id, field: 'institucion', text: row.institucion });
        }
        for (const row of experiences) {
          fields.push({ source: 'experiencia', table: 'experiencia_laboral', rowId: row.id, field: 'cargo', text: row.cargo });
          fields.push({ source: 'experiencia', table: 'experiencia_laboral', rowId: row.id, field: 'empresa', text: row.empresa });
        }
        for (const row of certifications) {
          fields.push({ source: 'certificacion', table: 'certificacion', rowId: row.id, field: 'nombre', text: row.nombre });
          fields.push({ source: 'certificacion', table: 'certificacion', rowId: row.id, field: 'entidad_emisora', text: row.entidad_emisora });
        }
        for (const row of profileRows) {
          if (row.descripcion_profesional) {
            fields.push({
              source: 'descripcion',
              table: 'perfil_area',
              rowId: row.id,
              field: 'descripcion_profesional',
              text: row.descripcion_profesional,
            });
          }
        }

        const matches: Array<SourceField & { normalizedMatches: number }> = [];
        for (const field of fields) {
          const extracted = extractor.extract(field.text);
          const count = extracted.keywords
            .filter(({ term }) => term === target)
            .reduce((total, match) => total + match.count, 0);
          if (count > 0) {
            matches.push({ ...field, normalizedMatches: count });
          }
        }

        const currentDescription = profileRows[0]?.descripcion_profesional ?? null;
        const allRowsFields = fields;
        const currentRowFields = fields.filter(
          (field) => field.source !== 'descripcion' || field.rowId === profileRows[0]?.id,
        );

        const reproducedWithAllRows = summarize(extractor, allRowsFields, areasByKeyword, target);
        const reproducedWithCurrentRow = summarize(extractor, currentRowFields, areasByKeyword, target);

        const servedAreas = (lastCalculation?.afinidad_registros ?? []).map((row) => ({
          areaId: row.area.id,
          areaName: row.area.nombre,
          points: Number(row.puntaje),
          percentage: Number(row.porcentaje),
          topKeywords: row.palabras_clave_top,
        }));

        return {
          mode: 'read-only',
          reviewedAt: new Date().toISOString(),
          tituladoId,
          target,
          dictionary: { loaded: loadReport.loaded, ignored: loadReport.ignored.length },
          profile: {
            perfilAreaRows: profileRows.map((row) => ({
              id: row.id,
              hasDescription: Boolean(row.descripcion_profesional),
              fecha_creacion: row.fecha_creacion,
              fecha_actualizacion: row.fecha_actualizacion,
            })),
            currentDescriptionRowId: profileRows[0]?.id ?? null,
            currentDescriptionHash: calculateInputHash(
              currentDescription ? [currentDescription] : [],
            ),
            counts: {
              formacion: educations.length,
              experiencia: experiences.length,
              certificacion: certifications.length,
              perfilArea: profileRows.length,
            },
          },
          matches,
          reproducedWithAllRows,
          reproducedWithCurrentRow,
          served: lastCalculation
            ? {
                calculationId: lastCalculation.id,
                calculatedAt: lastCalculation.fecha_calculo,
                algorithmVersion: lastCalculation.version_algoritmo,
                hash: lastCalculation.hash_entrada,
                status: lastCalculation.estado,
                areas: servedAreas,
              }
            : null,
        };
      },
      { timeout: 30000, maxWait: 5000 },
    );

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  process.stderr.write(`No se pudo completar el rastreo: ${message}\n`);
  process.exitCode = 1;
});
