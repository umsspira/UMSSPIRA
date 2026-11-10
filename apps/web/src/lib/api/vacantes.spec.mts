import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { clearAccessToken, setAccessToken } from '../../shared/services/auth-session.ts';
import { indexVacancy, updateVacancy } from './vacantes.ts';

beforeEach(() => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url');
  setAccessToken(`e30.${payload}.signature`);
});

afterEach(() => clearAccessToken());

describe('vacantes API client (HU5)', () => {
  it('actualiza los campos de la vacante manteniendo su identificador', async () => {
    const vacancyId = 'vacante-123';
    const payload = {
      titulo: 'Analista de datos',
      estado: 'Disponible',
      descripcion: 'Analizar datos y preparar reportes para el equipo.',
    };
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/api\/v1\/vacantes\/vacante-123$/);
      assert.equal(init?.method, 'PATCH');
      assert.deepEqual(JSON.parse(String(init?.body)), payload);
      return Response.json({ id: vacancyId, ...payload });
    };

    try {
      const updated = await updateVacancy(vacancyId, payload);
      assert.equal(updated.id, vacancyId);
      assert.equal(updated.titulo, payload.titulo);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('reindexa la vacante usando el identificador existente', async () => {
    const vacancyId = 'vacante-123';
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/api\/v1\/vacantes\/vacante-123\/indexar$/);
      assert.equal(init?.method, 'POST');
      return Response.json({
        indexed: true,
        id: vacancyId,
        index: 'vacantes',
      });
    };

    try {
      const result = await indexVacancy(vacancyId);
      assert.equal(result.indexed, true);
      assert.equal(result.id, vacancyId);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('muestra el error del backend cuando falla la actualización', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json(
        { message: 'La vacante no se pudo actualizar.' },
        { status: 503 },
      );

    try {
      await assert.rejects(
        () => updateVacancy('vacante-123', { titulo: 'Nuevo título' }),
        /La vacante no se pudo actualizar/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
