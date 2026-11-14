import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { ListPublishedJobPostingsUseCase } from './list-published-job-postings.use-case';

const areaA = '20000000-0000-4000-8000-000000000001';
const areaB = '20000000-0000-4000-8000-000000000002';
const graduate: ActorContext = {
  id: 'user-1',
  email: 'titulado@example.com',
  name: 'Titulado',
  role: 'titulado',
  permissions: [],
  scopes: { companyIds: [], graduateId: 'graduate-1', careerIds: [] },
  credentialVersion: 1,
};

function posting(
  id: string,
  publishedAt: string | null,
  areaIds: Array<string | null>,
): PublishedJobPosting {
  return {
    id,
    title: id,
    modality: 'REMOTO',
    experienceLevel: 'Junior',
    technicalDescription: 'Descripción de la vacante',
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    company: null,
    technicalRequirements: areaIds.map((areaId, index) => ({
      areaId,
      name: areaId === areaA ? 'TypeScript' : areaId === areaB ? 'PostgreSQL' : `Habilidad ${index}`,
      level: null,
    })),
  };
}

function repository(): jest.Mocked<JobPostingRepository> {
  return {
    create: jest.fn(),
    listPublished: jest.fn(),
    findPublishedById: jest.fn(),
    findGraduateSkills: jest.fn(),
  };
}

describe('ListPublishedJobPostingsUseCase', () => {
  const now = () => new Date('2026-11-14T12:00:00.000Z');

  it('ordena los porcentajes calculados de mayor a menor y conserva el porcentaje en cada vacante', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([
      posting('zero', '2026-11-10T00:00:00.000Z', [null]),
      posting('fifty', '2026-11-11T00:00:00.000Z', [areaA, null]),
      posting('hundred', '2026-11-09T00:00:00.000Z', [areaA]),
      posting('unmapped', '2026-11-12T00:00:00.000Z', []),
    ]);
    jobs.findGraduateSkills.mockResolvedValue({ areaIds: [areaA], evidence: [] });
    const useCase = new ListPublishedJobPostingsUseCase(jobs, now);

    const result = await useCase.execute(graduate);

    expect(result.map(({ id, affinityPercentage }) => [id, affinityPercentage])).toEqual([
      ['hundred', 100],
      ['fifty', 50],
      ['zero', 0],
      ['unmapped', null],
    ]);
    expect(jobs.findGraduateSkills).toHaveBeenCalledWith('graduate-1');
  });

  it('coloca primero la afinidad mayor y al final la menor calculada antes de las no calculadas', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([
      posting('low', null, [areaB]),
      posting('high', null, [areaA]),
      posting('no-score', null, []),
    ]);
    jobs.findGraduateSkills.mockResolvedValue({ areaIds: [areaA], evidence: [] });
    const result = await new ListPublishedJobPostingsUseCase(jobs, now).execute(graduate);

    expect(result.map(({ id }) => id)).toEqual(['high', 'low', 'no-score']);
  });

  it('usa fecha de publicación descendente e identificador ascendente como desempate determinista', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([
      posting('b', '2026-11-10T00:00:00.000Z', [areaA]),
      posting('c', '2026-11-12T00:00:00.000Z', [areaA]),
      posting('a', '2026-11-10T00:00:00.000Z', [areaA]),
    ]);
    jobs.findGraduateSkills.mockResolvedValue({ areaIds: [areaA], evidence: [] });
    const result = await new ListPublishedJobPostingsUseCase(jobs, now).execute(graduate);

    expect(result.map(({ id }) => id)).toEqual(['c', 'a', 'b']);
  });

  it('trata el 0 % como cálculo válido y mantiene null para afinidad no calculada', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([
      posting('uncalculated', null, []),
      posting('zero', null, [areaB]),
    ]);
    jobs.findGraduateSkills.mockResolvedValue({ areaIds: [areaA], evidence: [] });
    const result = await new ListPublishedJobPostingsUseCase(jobs, now).execute(graduate);

    expect(result.map(({ id, affinityPercentage }) => [id, affinityPercentage])).toEqual([
      ['zero', 0],
      ['uncalculated', null],
    ]);
  });

  it('desempata varias afinidades de 0 % y varias no calculadas de forma consistente', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([
      posting('null-b', null, []),
      posting('zero-b', '2026-11-10T00:00:00.000Z', [areaB]),
      posting('null-a', null, []),
      posting('zero-a', '2026-11-10T00:00:00.000Z', [areaB]),
    ]);
    jobs.findGraduateSkills.mockResolvedValue({ areaIds: [areaA], evidence: [] });
    const result = await new ListPublishedJobPostingsUseCase(jobs, now).execute(graduate);

    expect(result.map(({ id, affinityPercentage }) => [id, affinityPercentage])).toEqual([
      ['zero-a', 0],
      ['zero-b', 0],
      ['null-a', null],
      ['null-b', null],
    ]);
  });

  it('recalcula el orden en cada consulta cuando cambia el perfil', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([
      posting('typescript', null, [areaA]),
      posting('postgres', null, [areaB]),
    ]);
    jobs.findGraduateSkills
      .mockResolvedValueOnce({ areaIds: [areaA], evidence: [] })
      .mockResolvedValueOnce({ areaIds: [areaB], evidence: [] });
    const useCase = new ListPublishedJobPostingsUseCase(jobs, now);

    const first = await useCase.execute(graduate);
    const second = await useCase.execute(graduate);

    expect(first.map(({ id }) => id)).toEqual(['typescript', 'postgres']);
    expect(second.map(({ id }) => id)).toEqual(['postgres', 'typescript']);
    expect(jobs.findGraduateSkills).toHaveBeenCalledTimes(2);
  });

  it('no calcula afinidad para otros roles y conserva un orden secundario determinista', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([
      posting('older', '2026-11-10T00:00:00.000Z', [areaA]),
      posting('newer', '2026-11-12T00:00:00.000Z', [areaA]),
    ]);
    const company: ActorContext = {
      ...graduate,
      role: 'empresa',
      scopes: { companyIds: ['company-1'], graduateId: null, careerIds: [] },
    };
    const result = await new ListPublishedJobPostingsUseCase(jobs, now).execute(company);

    expect(result.map(({ id, affinityPercentage }) => [id, affinityPercentage])).toEqual([
      ['newer', null],
      ['older', null],
    ]);
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });

  it('devuelve una lista vacía válida sin consultar el perfil', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([]);

    await expect(new ListPublishedJobPostingsUseCase(jobs, now).execute(graduate)).resolves.toEqual(
      [],
    );
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });
});
