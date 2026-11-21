
import { RADAR_DICTIONARY } from '../src/modules/radar/domain/affinity-catalog';
import { DICTIONARY_VERSION } from '../src/modules/radar/domain/policies/affinity-config';
import {
  getRadarDictionaryFingerprint,
  getRadarDictionaryRelease,
} from '../scripts/seed/radar-dictionary-version';

describe('T15.3 - Versionado del diccionario Radar', () => {
  it('genera un hash SHA-256 estable', () => {
    const first = getRadarDictionaryFingerprint();
    const second = getRadarDictionaryFingerprint();

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('utiliza la versión oficial del radar', () => {
    const release = getRadarDictionaryRelease();

    expect(release.version).toBe(DICTIONARY_VERSION);
    expect(release.fingerprint).toBe(
      getRadarDictionaryFingerprint(),
    );
  });

  it('detecta modificaciones en los pesos', () => {
    const definition = RADAR_DICTIONARY['software-development'][0];
    const originalWeight = definition.weight;
    const originalHash = getRadarDictionaryFingerprint();

    try {
      definition.weight = originalWeight === 5 ? 4 : 5;

      expect(getRadarDictionaryFingerprint()).not.toBe(
        originalHash,
      );
    } finally {
      definition.weight = originalWeight;
    }
  });

  it('detecta modificaciones en los alias', () => {
    const definition = RADAR_DICTIONARY['software-development'][0];
    const originalAliases = definition.aliases;
    const originalHash = getRadarDictionaryFingerprint();

    try {
      definition.aliases = [
        ...(originalAliases ?? []),
        'alias-prueba-t153',
      ];

      expect(getRadarDictionaryFingerprint()).not.toBe(
        originalHash,
      );
    } finally {
      definition.aliases = originalAliases;
    }
  });
});
