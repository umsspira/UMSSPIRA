/**
 * Contrato provisional HU4/HU7, pendiente de aprobacion de sus responsables.
 * No registra servicios ni activa la indexacion o la busqueda.
 */
export interface JobPostingSearchDocument {
  readonly schema_version: 1;
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
const PUBLISHED_STATES: ReadonlySet<string> = new Set([
  'PUBLICADO',
  'PUBLICADA',
  'ACTIVA',
  'ACTIVO',
  'ACTIVE',
  'PUBLISHED',
]);

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
    schema_version: 1,
    id: source.id,
    titulo: source.titulo,
    id_empresa: source.id_empresa,
    razon_social: source.empresa?.razon_social ?? null,
    estado: source.estado,
    disponible:
      source.estado !== null &&
      PUBLISHED_STATES.has(source.estado) &&
      (source.fecha_cierre === null ||
        source.fecha_cierre.getTime() > nowTimestamp),
    created_at: createdAt,
    fecha_cierre: closingDate,
  };
}
