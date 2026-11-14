import type { ConfigService } from '@nestjs/config';

export const DEFAULT_JOB_POSTINGS_INDEX = 'job-postings-v1';

/** Un unico nombre literal; no admite listas, comodines ni expresiones de indices. */
export function resolveJobPostingsIndex(
  index: unknown,
  legacyIndex: unknown,
): string {
  const name = index === undefined ? DEFAULT_JOB_POSTINGS_INDEX : index;
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(name.trim())) {
    throw new Error(
      'ELASTICSEARCH_INDEX_JOB_POSTINGS debe ser un nombre literal no vacio.',
    );
  }
  const normalized = name.trim();
  const previous =
    typeof legacyIndex === 'string' && legacyIndex.trim()
      ? legacyIndex.trim()
      : 'vacantes';
  if (normalized === previous) {
    throw new Error(
      'ELASTICSEARCH_INDEX_JOB_POSTINGS debe ser distinto del indice anterior.',
    );
  }
  return normalized;
}

/** Configuracion comun de HU4/HU7. No crea clientes ni realiza solicitudes. */
export function getJobPostingSearchConfig(config: Pick<ConfigService, 'get'>) {
  const index = resolveJobPostingsIndex(
    config.get<unknown>('ELASTICSEARCH_INDEX_JOB_POSTINGS'),
    config.get<unknown>('ELASTICSEARCH_INDEX_VACANTES'),
  );
  const node = config.get<string>('ELASTICSEARCH_NODE')?.trim();
  if (!node) {
    throw new Error('ELASTICSEARCH_NODE no esta configurado.');
  }
  return {
    index,
    node: node.replace(/\/+$/, ''),
    apiKey: config.get<string>('ELASTICSEARCH_API_KEY'),
  };
}
