import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../config/supabase.service';
import type { RequisitoTecnico } from './contracts/requisito-tecnico';
import { SupabaseRequisitosTecnicosRepository } from './supabase-requisitos-tecnicos.repository';

const SUPABASE_URL = 'https://umsspira-test.supabase.co';
const VACANCY_ID = '11111111-1111-4111-8111-111111111111';
const REQUIREMENT_ID = '33333333-3333-4333-8333-333333333333';

const databaseRow = {
  id: REQUIREMENT_ID,
  id_vacante: VACANCY_ID,
  competencia: 'SQL',
  competencia_clave: 'sql',
  nivel: 'Intermedio' as const,
  tipo: 'Obligatorio' as const,
  descripcion: null,
  fecha_creacion: '2026-10-30T00:00:00.000Z',
};

describe('SupabaseRequisitosTecnicosRepository', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json([databaseRow], { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function createRepository(): SupabaseRequisitosTecnicosRepository {
    const configService = new ConfigService({
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });
    const supabaseService = new SupabaseService(
      createClient(SUPABASE_URL, 'test-anon-key'),
      configService,
    );
    return new SupabaseRequisitosTecnicosRepository(supabaseService);
  }

  it('persists requirements with a canonical competency key and maps the row', async () => {
    fetchSpy.mockResolvedValueOnce(
      Response.json([databaseRow], { status: 201 }),
    );
    const repository = createRepository();
    const requirement: RequisitoTecnico = {
      id: REQUIREMENT_ID,
      idVacante: VACANCY_ID,
      competencia: ' SQL ',
      nivel: 'Intermedio',
      tipo: 'Obligatorio',
      fechaCreacion: databaseRow.fecha_creacion,
    };

    await expect(repository.crear([requirement])).resolves.toEqual([
      {
        id: REQUIREMENT_ID,
        idVacante: VACANCY_ID,
        competencia: 'SQL',
        nivel: 'Intermedio',
        tipo: 'Obligatorio',
        descripcion: undefined,
        fechaCreacion: databaseRow.fecha_creacion,
      },
    ]);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe(
      '/rest/v1/requisito_tecnico_vacante',
    );
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual([
      {
        id: REQUIREMENT_ID,
        id_vacante: VACANCY_ID,
        competencia: ' SQL ',
        competencia_clave: 'sql',
        nivel: 'Intermedio',
        tipo: 'Obligatorio',
        descripcion: null,
        fecha_creacion: databaseRow.fecha_creacion,
      },
    ]);
  });

  it('filters reads by the requested vacancy', async () => {
    const repository = createRepository();

    await expect(repository.listarPorVacante(VACANCY_ID)).resolves.toHaveLength(
      1,
    );

    const [url] = fetchSpy.mock.calls[0];
    expect(new URL(String(url)).searchParams.get('id_vacante')).toBe(
      `eq.${VACANCY_ID}`,
    );
  });

  it('maps database uniqueness violations to a duplicate validation error', async () => {
    fetchSpy.mockResolvedValueOnce(
      Response.json(
        {
          code: '23505',
          details: null,
          hint: null,
          message: 'duplicate key value violates unique constraint',
        },
        { status: 409 },
      ),
    );
    const repository = createRepository();

    await expect(
      repository.crear([
        {
          id: REQUIREMENT_ID,
          idVacante: VACANCY_ID,
          competencia: 'SQL',
          nivel: 'Intermedio',
          tipo: 'Obligatorio',
          fechaCreacion: databaseRow.fecha_creacion,
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
