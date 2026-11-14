import { GetPublishedJobPostingTechnicalRequirementsUseCase } from '../src/modules/job-postings/application/use-cases/get-published-job-posting-technical-requirements.use-case';
import { JobPostingNotFoundError } from '../src/modules/job-postings/domain/errors/job-posting-not-found.error';
import { PrismaJobPostingRepository } from '../src/modules/job-postings/infrastructure/repositories/prisma-job-posting.repository';

const id = '10000000-0000-4000-8000-000000000001';
const now = new Date('2026-11-12T12:00:00.000Z');

type AvailabilityQuery = {
  where: {
    id: string;
    estado: { in: string[] };
    AND: Array<{
      OR:
        | Array<{ fecha_publicacion: null | { lte: Date } }>
        | Array<{ fecha_cierre: null | { gt: Date } }>;
    }>;
  };
};

describe('HU8 availability through the existing Prisma adapter (no database)', () => {
  it.each([
    ['published without a closing date', 'PUBLICADO', null, true],
    ['published until one millisecond later', 'PUBLICADO', new Date(now.getTime() + 1), true],
    ['closing exactly now', 'PUBLICADO', now, false],
    ['already expired', 'PUBLICADO', new Date(now.getTime() - 1), false],
    ['closed', 'CERRADA', null, false],
    ['draft', 'BORRADOR', null, false],
    ['paused', 'PAUSADA', null, false],
    ['missing', null, null, false],
  ] as const)('%s: never exposes requirements of an unavailable vacancy', async (
    _name, state, closesAt, available,
  ) => {
    const record = state === null ? null : {
      id, estado: state, fecha_cierre: closesAt, titulo: 'Vacante',
      modalidad: null, nivel_experiencia: null, descripcion_tecnica: null,
      fecha_publicacion: now, created_at: now, empresa: null,
      vacante_requerimiento_laboral_registros: [],
    };
    // Interpret the adapter's query operators, without supplying its publication
    // policy in the mock. This checks query composition, not PostgreSQL execution.
    const findFirst = jest.fn(async ({ where }: AvailabilityQuery) => {
      if (!record || record.id !== where.id || !where.estado.in.includes(record.estado)) {
        return null;
      }
      return where.AND.every(({ OR }) => OR.some((filter) => {
        if ('fecha_publicacion' in filter) {
          return filter.fecha_publicacion === null
            ? record.fecha_publicacion === null
            : record.fecha_publicacion !== null
              && record.fecha_publicacion <= filter.fecha_publicacion.lte;
        }

        return filter.fecha_cierre === null
          ? record.fecha_cierre === null
          : record.fecha_cierre !== null && record.fecha_cierre > filter.fecha_cierre.gt;
      }))
        ? record : null;
    });
    const requirements = { obtenerRequisitos: jest.fn().mockResolvedValue([]) };
    const useCase = new GetPublishedJobPostingTechnicalRequirementsUseCase(
      new PrismaJobPostingRepository({ vacante: { findFirst } } as never),
      requirements,
      () => now,
    );

    if (available) {
      await expect(useCase.execute(id)).resolves.toEqual({ idVacante: id, requisitos: [] });
      expect(requirements.obtenerRequisitos).toHaveBeenCalledTimes(1);
      expect(requirements.obtenerRequisitos).toHaveBeenCalledWith(id);
    } else {
      await expect(useCase.execute(id)).rejects.toBeInstanceOf(JobPostingNotFoundError);
      expect(requirements.obtenerRequisitos).not.toHaveBeenCalled();
    }
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
