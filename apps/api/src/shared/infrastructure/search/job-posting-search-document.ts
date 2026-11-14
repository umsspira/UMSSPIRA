export const JOB_POSTING_SEARCH_SCHEMA_VERSION = 1;

/**
 * Contrato provisional HU4/HU7, pendiente de aprobacion de sus responsables.
 * No registra servicios ni activa la indexacion o la busqueda.
 */
export interface JobPostingSearchDocument {
  readonly schema_version: typeof JOB_POSTING_SEARCH_SCHEMA_VERSION;
  readonly id: string;
  readonly titulo: string | null;
  readonly id_empresa: string | null;
  readonly razon_social: string | null;
  readonly estado: string | null;
  /** Disponibilidad al transformar; HU7 debera comprobar tambien el cierre al buscar. */
  readonly disponible: boolean;
  readonly created_at: string | null;
  readonly fecha_cierre: string | null;
}

/** Proyeccion de Vacante y Empresa: las fechas oficiales llegan como Date de Prisma. */
export interface JobPostingSearchSource {
  readonly id: string;
  readonly titulo: string | null;
  readonly id_empresa: string | null;
  readonly empresa: { readonly razon_social: string | null } | null;
  readonly estado: string | null;
  readonly created_at: Date | null;
  readonly fecha_cierre: Date | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Misma comparacion exacta que publishedWhere en PrismaJobPostingRepository (HU8/HU12).
export const JOB_POSTING_PUBLISHED_STATES: readonly string[] = Object.freeze([
  'PUBLICADO',
  'PUBLICADA',
  'ACTIVA',
  'ACTIVO',
  'ACTIVE',
  'PUBLISHED',
]);

const PUBLISHED_STATES: ReadonlySet<string> = new Set(
  JOB_POSTING_PUBLISHED_STATES,
);

export function isPublishedJobPostingState(value: unknown): value is string {
  return typeof value === 'string' && PUBLISHED_STATES.has(value);
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableIsoDate(value: unknown): value is string | null {
  if (value === null) {
    return true;
  }
  if (typeof value !== 'string') {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

/** Valida el JSON de Elasticsearch y proyecta solamente el contrato compartido. */
export function parseJobPostingSearchDocument(
  value: unknown,
): JobPostingSearchDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Documento de busqueda invalido.');
  }
  const source = value as Record<string, unknown>;
  if (
    source.schema_version !== JOB_POSTING_SEARCH_SCHEMA_VERSION ||
    typeof source.id !== 'string' ||
    !UUID_PATTERN.test(source.id) ||
    !isNullableText(source.titulo) ||
    !(
      source.id_empresa === null ||
      (typeof source.id_empresa === 'string' &&
        UUID_PATTERN.test(source.id_empresa))
    ) ||
    !isNullableText(source.razon_social) ||
    !isNullableText(source.estado) ||
    typeof source.disponible !== 'boolean' ||
    !isNullableIsoDate(source.created_at) ||
    !isNullableIsoDate(source.fecha_cierre)
  ) {
    throw new TypeError('Documento de busqueda invalido.');
  }
  return {
    schema_version: source.schema_version,
    id: source.id,
    titulo: source.titulo,
    id_empresa: source.id_empresa,
    razon_social: source.razon_social,
    estado: source.estado,
    disponible: source.disponible,
    created_at: source.created_at,
    fecha_cierre: source.fecha_cierre,
  };
}

function assertUuid(value: string, field: string): void {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new TypeError(`${field} debe ser un UUID valido.`);
  }
}

function timestamp(value: Date, field: string): number {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new RangeError(`${field} debe ser una fecha valida.`);
  }
  return value.getTime();
}

function toIsoDate(value: Date | null, field: string): string | null {
  if (value === null) {
    return null;
  }
  timestamp(value, field);
  return value.toISOString();
}

/** Funcion pura: no consulta servicios, no modifica la fuente ni lee el reloj global. */
export function toJobPostingSearchDocument(
  source: JobPostingSearchSource,
  now: Date,
): JobPostingSearchDocument {
  assertUuid(source.id, 'id');
  if (source.id_empresa !== null) {
    assertUuid(source.id_empresa, 'id_empresa');
  }

  const nowTimestamp = timestamp(now, 'now');
  const createdAt = toIsoDate(source.created_at, 'created_at');
  const closingDate = toIsoDate(source.fecha_cierre, 'fecha_cierre');

  return {
    schema_version: JOB_POSTING_SEARCH_SCHEMA_VERSION,
    id: source.id,
    titulo: source.titulo,
    id_empresa: source.id_empresa,
    razon_social: source.empresa?.razon_social ?? null,
    estado: source.estado,
    disponible:
      isPublishedJobPostingState(source.estado) &&
      (source.fecha_cierre === null ||
        source.fecha_cierre.getTime() > nowTimestamp),
    created_at: createdAt,
    fecha_cierre: closingDate,
  };
}
