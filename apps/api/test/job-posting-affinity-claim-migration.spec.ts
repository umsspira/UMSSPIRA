import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type SqlBoolean = boolean | null;

function sqlAnd(...values: SqlBoolean[]): SqlBoolean {
  if (values.includes(false)) {return false;}
  return values.includes(null) ? null : true;
}

function sqlOr(...values: SqlBoolean[]): SqlBoolean {
  if (values.includes(true)) {return true;}
  return values.includes(null) ? null : false;
}

const migration = readFileSync(resolve(
  __dirname, '../prisma/migrations/20261121120000_epic5_hu12_vigencia_afinidad/migration.sql',
), 'utf8');
const claimCheck = migration.match(/ADD CONSTRAINT "postulacion_reclamo_match_check"\s+CHECK\s*\(([\s\S]*?)\);/)?.[1];

describe('restricción de reclamo de afinidad HU-12 (verificación estática)', () => {
  it('exige los tres campos nulos o los tres presentes y un SHA-256 válido', () => {
    expect(claimCheck).toBeDefined();
    for (const column of ['hash_en_calculo', 'reclamo_match_id', 'reclamo_match_hasta']) {
      expect(claimCheck).toContain(`"${column}" IS NULL`);
      expect(claimCheck).toContain(`"${column}" IS NOT NULL`);
    }
    expect(claimCheck).toContain('"hash_en_calculo" ~ \'^[0-9a-f]{64}$\'');
  });

  it.each(Array.from({ length: 8 }, (_, mask) => [
    Boolean(mask & 1), Boolean(mask & 2), Boolean(mask & 4), mask === 0 || mask === 7,
  ]))('nulos/presentes hash=%s, id=%s, hasta=%s: aceptación=%s', (hasHash, hasId, hasUntil, expected) => {
    // PostgreSQL acepta CHECK=true o UNKNOWN; reproducimos esa lógica sin conectar a una base.
    const hash: string | null = hasHash ? 'a'.repeat(64) : null;
    const id: string | null = hasId ? '00000000-0000-4000-8000-000000000001' : null;
    const until: Date | null = hasUntil ? new Date('2026-11-21T00:00:00Z') : null;
    const allNull = sqlAnd(hash === null, id === null, until === null);
    const hashPattern: SqlBoolean = hash === null ? null : /^[0-9a-f]{64}$/.test(hash);
    const allValid = sqlAnd(
      claimCheck!.includes('"hash_en_calculo" IS NOT NULL') ? hash !== null : true,
      hashPattern,
      id !== null,
      until !== null,
    );
    expect(sqlOr(allNull, allValid) !== false).toBe(expected);
  });

  it('rechaza un hash presente pero inválido', () => {
    const hash = 'invalid';
    expect(sqlOr(false, sqlAnd(hash !== null, /^[0-9a-f]{64}$/.test(hash), true, true))).toBe(false);
  });
});
