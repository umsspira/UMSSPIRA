import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { CreateVacanteDto } from './dto/create-vacante.dto';
import { VacantesService } from './vacantes.service';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

type MockVacancy = {
  id: string;
  id_empresa: string;
  titulo: string;
  modalidad: string;
  estado: string;
  created_at: Date;
  descripcion_tecnica: string;
  ubicacion: string;
  area: string;
  condiciones: string;
  fecha_publicacion: Date;
};

type MockRequirement = {
  id: string;
  id_empresa: string;
  titulo: string;
  estado: string;
};

type PrismaMock = {
  empresa: { findFirst: jest.Mock };
  vacante: { create: jest.Mock; findUnique: jest.Mock };
  requerimientoLaboral: { create: jest.Mock };
  vacanteRequerimientoLaboral: { create: jest.Mock };
  $transaction: jest.Mock;
};

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

describe('VacantesService - Prisma', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: VacantesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new VacantesService(prisma as unknown as PrismaService);
  });

  describe('VacantesService - postulantes', () => {
    const vacancyId = '44500000-0000-4000-8000-000000000001';
    const applicationId = '44800000-0000-4000-8000-000000000001';
    const userId = '20000000-0000-4000-8000-000000000003';

    function application(overrides: Record<string, unknown> = {}) {
      return {
        id: applicationId,
        estado: 'preseleccionado',
        porcentaje_match: '92.50',
        created_at: new Date('2026-11-02T00:00:00.000Z'),
        usuario: {
          nombre: 'Ana Rojas',
          correo: 'ana.rojas.demo@umsspira.local',
          titulado: {
            nombre: 'Ana',
            apellido: 'Rojas',
            curriculum_vitae: null,
          },
        },
        ...overrides,
      };
    }

    function createApplicantsService(
      options: {
        visibleVacancies?: number;
        applications?: unknown[];
        detail?: unknown;
      } = {},
    ) {
      const prisma = {
        vacante: {
          count: jest.fn().mockResolvedValue(options.visibleVacancies ?? 1),
        },
        postulacion: {
          findMany: jest
            .fn()
            .mockResolvedValue(options.applications ?? [application()]),
          findFirst: jest
            .fn()
            .mockResolvedValue(
              options.detail === undefined ? application() : options.detail,
            ),
        },
      };
      return { service: new VacantesService(prisma as never), prisma };
    }

    it('returns applicants in the frontend contract and preserves the engine match score', async () => {
      const { service } = createApplicantsService();

      await expect(
        service.listarPostulantes(vacancyId, userId),
      ).resolves.toEqual([
        {
          id: applicationId,
          name: 'Ana Rojas',
          email: 'ana.rojas.demo@umsspira.local',
          location: null,
          experienceLevel: null,
          stage: 'preseleccionado',
          appliedAt: '2026-11-02T00:00:00.000Z',
          hasCv: false,
          cvUrl: null,
          matchPercentage: 92.5,
          skills: null,
        },
      ]);
    });

    it('orders applicants by match score descending and null scores last', async () => {
      const { service, prisma } = createApplicantsService();

      await service.listarPostulantes(vacancyId, userId);

      expect(prisma.postulacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_vacante: vacancyId },
          orderBy: [
            { porcentaje_match: { sort: 'desc', nulls: 'last' } },
            { created_at: 'asc' },
          ],
        }),
      );
    });

    it('allows the company owner and active invited members', async () => {
      const { service, prisma } = createApplicantsService();

      await service.listarPostulantes(vacancyId, userId);

      expect(prisma.vacante.count).toHaveBeenCalledWith({
        where: {
          id: vacancyId,
          empresa: {
            OR: [
              { id_usuario: userId },
              {
                empresa_usuario_registros: {
                  some: { id_usuario: userId, estado: 'activo' },
                },
              },
            ],
          },
        },
      });
    });

    it('returns not found for an inaccessible vacancy without reading applications', async () => {
      const { service, prisma } = createApplicantsService({
        visibleVacancies: 0,
      });

      await expect(
        service.listarPostulantes(vacancyId, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.postulacion.findMany).not.toHaveBeenCalled();
    });

    it('does not invent a match score when the matching engine returned none', async () => {
      const { service } = createApplicantsService({
        applications: [application({ porcentaje_match: null })],
      });

      const applicants = await service.listarPostulantes(vacancyId, userId);

      expect(applicants[0]?.matchPercentage).toBeNull();
    });

    it('falls back to the user name and reports CV availability', async () => {
      const { service } = createApplicantsService({
        applications: [
          application({
            usuario: {
              nombre: 'Usuario sin perfil',
              correo: 'x@umsspira.local',
              titulado: {
                nombre: null,
                apellido: null,
                curriculum_vitae: { id: 'cv-1' },
              },
            },
          }),
        ],
      });

      const applicants = await service.listarPostulantes(vacancyId, userId);

      expect(applicants[0]?.name).toBe('Usuario sin perfil');
      expect(applicants[0]?.hasCv).toBe(true);
    });

    it('returns an applicant detail scoped to its vacancy', async () => {
      const { service, prisma } = createApplicantsService();

      const detail = await service.obtenerPostulante(
        vacancyId,
        applicationId,
        userId,
      );

      expect(detail.id).toBe(applicationId);
      expect(prisma.postulacion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: applicationId, id_vacante: vacancyId },
        }),
      );
    });

    it('returns not found when the applicant does not belong to the vacancy', async () => {
      const { service } = createApplicantsService({ detail: null });

      await expect(
        service.obtenerPostulante(vacancyId, applicationId, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('crea vacante y requisitos usando la empresa vinculada al usuario', async () => {
    const created = await service.crear(
      validDto({ idEmpresa: undefined }),
      USER_ID,
    );

    expect(created.idEmpresa).toBe(COMPANY_ID);
    expect(created.empresa).toBe('TecnoAndes S.R.L.');
    expect(created.requisitos.map((item) => item.nombre)).toEqual([
      'SQL',
      'Python',
    ]);
    expect(prisma.vacante.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_empresa: COMPANY_ID }),
      }),
    );
  });

  it('rechaza crear vacantes en una empresa distinta a la vinculada', async () => {
    await expect(
      service.crear(validDto({ idEmpresa: OTHER_COMPANY_ID }), USER_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza requisitos duplicados antes de persistir', async () => {
    await expect(
      service.crear(validDto({ requisitos: ['SQL', ' sql '] }), USER_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.vacante.create).not.toHaveBeenCalled();
  });

  it('permite omitir idEmpresa en el DTO, pero valida un UUID cuando se envía', async () => {
    const withoutCompanyId = validDto({ idEmpresa: undefined });
    const invalidCompanyId = validDto({ idEmpresa: 'not-a-uuid' });

    await expect(validate(withoutCompanyId)).resolves.toHaveLength(0);
    const errors = await validate(invalidCompanyId);
    expect(errors.map((error) => error.property)).toContain('idEmpresa');
  });
});

function createPrismaMock() {
  const vacancies = new Map<string, MockVacancy>();
  const requirements = new Map<string, MockRequirement>();
  const vacancyRequirements = new Map<string, string[]>();
  let nextId = 0;

  const prisma: PrismaMock = {
    empresa: {
      findFirst: jest.fn(
        async ({ where }: { where: { id_usuario: string } }) =>
          where.id_usuario === USER_ID
            ? { id: COMPANY_ID, razon_social: 'TecnoAndes S.R.L.' }
            : null,
      ),
    },
    vacante: {
      create: jest.fn(async ({ data }: { data: Omit<MockVacancy, 'id'> }) => {
        const id = `vacancy-${++nextId}`;
        const vacancy: MockVacancy = { id, ...data };
        vacancies.set(id, vacancy);
        return vacancy;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        hydrateVacancy(
          vacancies.get(where.id),
          requirements,
          vacancyRequirements,
        ),
      ),
    },
    requerimientoLaboral: {
      create: jest.fn(
        async ({ data }: { data: Omit<MockRequirement, 'id'> }) => {
          const id = `requirement-${++nextId}`;
          const requirement: MockRequirement = { id, ...data };
          requirements.set(id, requirement);
          return requirement;
        },
      ),
    },
    vacanteRequerimientoLaboral: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: { id_vacante: string; id_requerimiento_laboral: string };
        }) => {
          const linked = vacancyRequirements.get(data.id_vacante) ?? [];
          linked.push(data.id_requerimiento_laboral);
          vacancyRequirements.set(data.id_vacante, linked);
          return data;
        },
      ),
    },
    $transaction: jest.fn(
      async (
        operation: (transaction: unknown) => Promise<unknown>,
      ): Promise<unknown> => await operation(prisma),
    ),
  };

  return prisma;
}

function hydrateVacancy(
  vacancy: MockVacancy | undefined,
  requirements: Map<string, MockRequirement>,
  vacancyRequirements: Map<string, string[]>,
) {
  if (!vacancy) {
    return null;
  }
  return {
    ...vacancy,
    empresa: { razon_social: 'TecnoAndes S.R.L.' },
    vacante_requerimiento_laboral_registros: (
      vacancyRequirements.get(vacancy.id) ?? []
    ).flatMap((id) => {
      const requirement = requirements.get(id);
      return requirement ? [{ requerimiento_laboral: requirement }] : [];
    }),
  };
}
