import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TechnicalRequirementsClient } from './technical-requirements-client.ts';
import type { RequisitoTecnico } from './contracts.ts';

describe('TechnicalRequirementsClient (HU2)', () => {
  it('normaliza nombres de competencias canónicas', () => {
    assert.equal(TechnicalRequirementsClient.canonicalName(' SQL '), 'sql');
    assert.equal(
      TechnicalRequirementsClient.canonicalName('Gestión Ágil'),
      'gestion agil',
    );
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
        const match = urlStr.match(/\/vacantes\/([^/]+)\/requisitos/);
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
