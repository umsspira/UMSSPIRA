
import { createHash } from 'node:crypto';
import { RADAR_DICTIONARY } from '../../src/modules/radar/domain/affinity-catalog';
import { normalizePhrase } from '../../src/modules/nlp/domain/policies/text-normalizer';
import { DICTIONARY_VERSION } from '../../src/modules/radar/domain/policies/affinity-config';

export function getRadarDictionaryFingerprint(): string {
  const entries = Object.entries(RADAR_DICTIONARY)
    .flatMap(([area, definitions]) =>
      definitions.map((definition) => ({
        area,
        term: normalizePhrase(definition.term),
        weight: definition.weight,
        aliases: [...new Set(
          (definition.aliases ?? []).map(normalizePhrase),
        )].sort(),
      })),
    )
    .sort((a, b) =>
      a.area.localeCompare(b.area, 'en') ||
      a.term.localeCompare(b.term, 'en'),
    );

  return createHash('sha256')
    .update(JSON.stringify(entries))
    .digest('hex');
}

export function getRadarDictionaryRelease() {
  return {
    version: DICTIONARY_VERSION,
    fingerprint: getRadarDictionaryFingerprint(),
  };
}
