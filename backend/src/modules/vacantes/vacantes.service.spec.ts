import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { SupabaseService } from '../../config/supabase.service';
import { CreateVacanteDto } from './dto/create-vacante.dto';
import { VacantesService } from './vacantes.service';

type StoredVacancy = {
  id: string;
  id_empresa: string;
  titulo: string;
  modalidad: string;
  estado: string;
  created_at: string;
  descripcion: string;
  ubicacion: string;
  area: string;
  condiciones: string;
  empresa: { razon_social: string };
  vacante_requerimiento_laboral: Array<{
    requerimiento_laboral: {
      id: string;
      titulo: string;
    };
  }>;
};

class VacancyQuery {
  private filters = new Map<string, string>();

  constructor(private readonly client: FakeSupabaseClient) {}

  select() {
    return this;
  }

  eq(column: string, value: string) {
    this.filters.set(column, value);
    return this;
  }

  async maybeSingle() {
    const rows = this.filteredRows();
    return { data: rows[0] ?? null, error: null };
  }

  async order() {
    return { data: this.filteredRows().reverse(), error: null };
  }

  private filteredRows() {
    return [...this.client.vacancies.values()].filter((vacancy) =>
      [...this.filters].every(
        ([column, value]) =>
          vacancy[column as keyof StoredVacancy] === value,
      ),
    );
  }
}

class FakeSupabaseClient {
  readonly companies = new Map([
    ['11111111-1111-4111-8111-111111111111', 'TecnoAndes S.R.L.'],
    ['22222222-2222-4222-8222-222222222222', 'Otra Empresa'],
  ]);
  readonly vacancies = new Map<string, StoredVacancy>();
  failNextRpc = false;
  private sequence = 0;

  from(table: string) {
    if (table !== 'vacante') throw new Error(`Tabla no simulada: ${table}`);
    return new VacancyQuery(this);
  }

  async rpc(name: string, params: Record<string, unknown>) {
    if (this.failNextRpc) {
      this.failNextRpc = false;
      return { data: null, error: { code: 'XX000', message: 'SQL privado' } };
    }

    if (name === 'crear_vacante_con_requisitos') {
      const companyId = String(params.p_id_empresa);
      const company = this.companies.get(companyId);
      if (!company) {
        return {
          data: null,
          error: { code: '23503', message: 'EMPRESA_NO_EXISTE' },
        };
      }

      const id = this.nextUuid();
      this.vacancies.set(
        id,
        this.buildVacancy(id, companyId, company, params),
      );
      return { data: id, error: null };
    }

    if (name === 'agregar_requisitos_vacante') {
      const id = String(params.p_id_vacante);
      const vacancy = this.vacancies.get(id);
      if (!vacancy) {
        return {
          data: null,
          error: { code: '23503', message: 'VACANTE_NO_EXISTE' },
        };
      }

      const requirements = params.p_requisitos as string[];
      const existingRequirements =
        vacancy.vacante_requerimiento_laboral.map((relation) =>
          relation.requerimiento_laboral.titulo.trim().toLowerCase(),
        );

      if (
        requirements.some((requirement) =>
          existingRequirements.includes(requirement.trim().toLowerCase()),
        )
      ) {
        return {
          data: null,
          error: { code: '22023', message: 'REQUISITO_DUPLICADO' },
        };
      }

      vacancy.vacante_requerimiento_laboral.push(
        ...requirements.map((requirement) => ({
          requerimiento_laboral: {
            id: this.nextUuid(),
            titulo: requirement,
          },
        })),
      );
      return { data: null, error: null };
    }

    throw new Error(`RPC no simulada: ${name}`);
  }

  private nextUuid() {
    this.sequence += 1;
    return `00000000-0000-4000-8000-${String(this.sequence).padStart(12, '0')}`;
  }

  private buildVacancy(
    id: string,
    companyId: string,
    company: string,
    params: Record<string, unknown>,
  ): StoredVacancy {
    return {
      id,
      id_empresa: companyId,
      titulo: String(params.p_titulo),
      modalidad: String(params.p_modalidad),
      estado: 'Disponible',
      created_at: '2026-10-14T23:24:00.000Z',
      descripcion: String(params.p_descripcion),
      ubicacion: String(params.p_ubicacion),
      area: String(params.p_area),
      condiciones: String(params.p_condiciones),
      empresa: { razon_social: company },
      vacante_requerimiento_laboral: (
        params.p_requisitos as string[]
      ).map((requirement) => ({
        requerimiento_laboral: {
          id: this.nextUuid(),
          titulo: requirement,
        },
      })),
    };
  }
}

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

function validDto(overrides: Partial<CreateVacanteDto> = {}) {
  return Object.assign(new CreateVacanteDto(), {
    idEmpresa: COMPANY_ID,
    titulo: 'Analista de Datos Junior',
    modalidad: 'Híbrido',
    descripcion: 'Analiza información para apoyar decisiones de negocio.',
    ubicacion: 'Cochabamba',
    area: 'Datos y Analítica',
    condiciones: 'Jornada completa.',
    requisitos: ['SQL', 'Python'],
    ...overrides,
  });
}

describe('VacantesService - HU5-S1-03', () => {
  let client: FakeSupabaseClient;
  let service: VacantesService;

  beforeEach(() => {
    client = new FakeSupabaseClient();
    service = new VacantesService({
      getClient: () => client,
    } as unknown as SupabaseService);
  });

  it('AC1 persiste una vacante válida', async () => {
    const created = await service.crear(validDto());

    expect(client.vacancies.has(created.id)).toBe(true);
    expect(created.titulo).toBe('Analista de Datos Junior');
  });

  it('AC2 recupera únicamente la vacante solicitada por identificador', async () => {
    const first = await service.crear(validDto({ titulo: 'Primera vacante' }));
    await service.crear(validDto({ titulo: 'Segunda vacante' }));

    const found = await service.obtenerPorId(first.id);

    expect(found.id).toBe(first.id);
    expect(found.titulo).toBe('Primera vacante');
  });

  it('AC3 conserva los requisitos asociados después de una nueva consulta', async () => {
    const created = await service.crear(validDto());
    const freshService = new VacantesService({
      getClient: () => client,
    } as unknown as SupabaseService);

    const found = await freshService.obtenerPorId(created.id);

    expect(found.requisitos.map((requirement) => requirement.nombre)).toEqual([
      'SQL',
      'Python',
    ]);
  });

  it('AC4 rechaza requisitos para una vacante inexistente sin crear huérfanos', async () => {
    const requirementsBefore = [...client.vacancies.values()].flatMap(
      (vacancy) => vacancy.vacante_requerimiento_laboral,
    ).length;

    await expect(
      service.agregarRequisitos(
        '99999999-9999-4999-8999-999999999999',
        ['SQL'],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const requirementsAfter = [...client.vacancies.values()].flatMap(
      (vacancy) => vacancy.vacante_requerimiento_laboral,
    ).length;
    expect(requirementsAfter).toBe(requirementsBefore);
  });

  it('AC5 responde 404 para un identificador inexistente', async () => {
    await service.crear(validDto());

    await expect(
      service.obtenerPorId('99999999-9999-4999-8999-999999999999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza un payload inválido mediante el DTO', async () => {
    const errors = await validate(
      validDto({ idEmpresa: 'no-es-uuid', requisitos: [] }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['idEmpresa', 'requisitos']),
    );
  });

  it('propaga un fallo de persistencia como error interno controlado', async () => {
    client.failNextRpc = true;

    await expect(service.crear(validDto())).rejects.toEqual(
      new InternalServerErrorException('No se pudo guardar la vacante.'),
    );
  });

  it('mantiene aisladas dos vacantes y sus requisitos', async () => {
    const first = await service.crear(validDto({ requisitos: ['SQL'] }));
    const second = await service.crear(
      validDto({ titulo: 'Backend Developer', requisitos: ['TypeScript'] }),
    );

    const [foundFirst, foundSecond] = await Promise.all([
      service.obtenerPorId(first.id),
      service.obtenerPorId(second.id),
    ]);

    expect(foundFirst.requisitos.map((item) => item.nombre)).toEqual(['SQL']);
    expect(foundSecond.requisitos.map((item) => item.nombre)).toEqual([
      'TypeScript',
    ]);
  });

  it('rechaza con 400 un requisito duplicado en una llamada posterior', async () => {
    const created = await service.crear(validDto({ requisitos: ['SQL'] }));

    await expect(
      service.agregarRequisitos(created.id, [' sql ']),
    ).rejects.toEqual(
      new BadRequestException(
        'Uno o más requisitos ya están asociados a la vacante.',
      ),
    );

    const found = await service.obtenerPorId(created.id);
    expect(found.requisitos.map((item) => item.nombre)).toEqual(['SQL']);
  });

  it('lista exclusivamente las vacantes de la empresa indicada', async () => {
    await service.crear(validDto());
    await service.crear(
      validDto({
        idEmpresa: '22222222-2222-4222-8222-222222222222',
        titulo: 'Vacante de otra empresa',
      }),
    );

    const vacancies = await service.listarPorEmpresa(COMPANY_ID);

    expect(vacancies).toHaveLength(1);
    expect(vacancies[0].idEmpresa).toBe(COMPANY_ID);
  });
});
