import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { clearAccessToken, setAccessToken } from '../../shared/services/auth-session.ts';
import { TechnicalRequirementsClient } from './technical-requirements-client.ts';
import type { RequisitoTecnico } from './contracts.ts';

beforeEach(() => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url');
  setAccessToken(`e30.${payload}.signature`);
});

afterEach(() => clearAccessToken());

describe('TechnicalRequirementsClient (HU2)', () => {
  it('normaliza nombres de competencias canónicas', () => {
    assert.equal(TechnicalRequirementsClient.canonicalName(' SQL '), 'sql');
    assert.equal(
      TechnicalRequirementsClient.canonicalName('Gestión Ágil'),
      'gestion agil',
    );
  });

  describe('Strict remote requirement methods (HU5)', () => {
    it('loads requirements from the backend without local fallback', async () => {
      const requirement: RequisitoTecnico = {
        id: 'req-1',
        idVacante: 'vac-1',
        competencia: 'SQL',
        nivel: 'Avanzado',
        tipo: 'Obligatorio',
        fechaCreacion: '2026-10-30T12:00:00.000Z',
      };
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        assert.match(String(input), /\/api\/v1\/vacantes\/vac-1\/requisitos$/);
        return Response.json([requirement]);
      };

      try {
        const client = new TechnicalRequirementsClient('http://test-api');
        assert.deepEqual(await client.obtenerRequisitosRemotos('vac-1'), [
          requirement,
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('creates, updates, and deletes requirements through remote endpoints', async () => {
      const updatedRequirement: RequisitoTecnico = {
        id: 'req-1',
        idVacante: 'vac-1',
        competencia: 'SQL',
        nivel: 'Experto',
        tipo: 'Deseable',
        fechaCreacion: '2026-10-30T12:00:00.000Z',
      };
      const addedRequirement: RequisitoTecnico = {
        id: 'req-2',
        idVacante: 'vac-1',
        competencia: 'TypeScript',
        nivel: 'Intermedio',
        tipo: 'Obligatorio',
        fechaCreacion: '2026-10-30T12:00:00.000Z',
      };
      const requests: Array<{ url: string; method: string; body?: unknown }> = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        const method = init?.method ?? 'GET';
        const url = String(input);
        const body = init?.body
          ? JSON.parse(String(init.body))
          : undefined;
        requests.push({ url, method, body });

        if (method === 'PATCH') return Response.json(updatedRequirement);
        if (method === 'POST') return Response.json([addedRequirement]);
        return Response.json({ eliminado: true, id: 'req-1' });
      };

      try {
        const client = new TechnicalRequirementsClient('http://test-api');
        await client.actualizarRequisitoRemoto('vac-1', 'req-1', {
          nivel: 'Experto',
          tipo: 'Deseable',
        });
        await client.eliminarRequisitoRemoto('vac-1', 'req-1');
        const added = await client.asociarRequisitosRemotos('vac-1', [
          {
            competencia: 'TypeScript',
            nivel: 'Intermedio',
            tipo: 'Obligatorio',
          },
        ]);

        assert.deepEqual(
          requests.map(({ method }) => method),
          ['PATCH', 'DELETE', 'POST'],
        );
        assert.deepEqual(requests[0].body, {
          nivel: 'Experto',
          tipo: 'Deseable',
        });
        assert.equal(added[0].id, 'req-2');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('propagates errors instead of reporting failed remote updates as saved', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        Response.json(
          { message: 'El requisito no se pudo actualizar.' },
          { status: 503 },
        );

      try {
        const client = new TechnicalRequirementsClient('http://test-api');
        await assert.rejects(
          () =>
            client.actualizarRequisitoRemoto('vac-1', 'req-1', {
              nivel: 'Experto',
            }),
          /El requisito no se pudo actualizar/,
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  it('asocia requisitos a la vacante usando backend simulado', async () => {
    const mockDb: Record<string, RequisitoTecnico[]> = {};
    const client = new TechnicalRequirementsClient('http://test-api');

    // Simulate fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      const urlStr = String(url);
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          requisitos: Array<Omit<RequisitoTecnico, 'id' | 'idVacante' | 'fechaCreacion'>>;
        };
        const match = urlStr.match(/\/api\/v1\/vacantes\/([^/]+)\/requisitos/);
        const vacId = match?.[1] ?? '';
        mockDb[vacId] = body.requisitos.map((r, idx) => ({
          id: `id-${idx}`,
          idVacante: vacId,
          competencia: r.competencia,
          nivel: r.nivel,
          tipo: r.tipo,
          descripcion: r.descripcion,
          fechaCreacion: new Date().toISOString(),
        }));
        return Response.json(mockDb[vacId]);
      }
      return Response.json([]);
    };


    try {
      const result = await client.asociarRequisitos('VAC-001', [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: 'Python', nivel: 'Intermedio', tipo: 'Obligatorio' },
      ]);

      assert.equal(result.length, 2);
      assert.equal(result[0].competencia, 'SQL');
      assert.equal(result[1].competencia, 'Python');
      assert.equal(result[0].idVacante, 'VAC-001');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('propaga error al recibir duplicado del backend', async () => {
    const client = new TechnicalRequirementsClient('http://test-api');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return Response.json(
        { message: "El requisito técnico 'SQL' ya está asociado a esta vacante." },
        { status: 400 },
      );
    };

    try {
      await assert.rejects(
        () =>
          client.asociarRequisitos('VAC-001', [
            { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
          ]),
        /ya está asociado/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
