import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { ListPublishedJobPostingsUseCase } from './list-published-job-postings.use-case';

const postings: PublishedJobPosting[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    title: 'Desarrollador frontend',
    modality: 'REMOTO',
    experienceLevel: 'Junior',
    technicalDescription: 'Interfaz web',
    publishedAt: null,
    company: {
      name: 'Empresa A',
      description: null,
      logoUrl: null,
      bannerUrl: null,
    },
    technicalRequirements: [
      { areaId: 'area-frontend', name: 'Desarrollo frontend', level: null },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    title: 'Analista de datos',
    modality: 'HIBRIDO',
    experienceLevel: 'Semi senior',
    technicalDescription: 'Análisis',
    publishedAt: null,
    company: {
      name: 'Empresa B',
      description: null,
      logoUrl: null,
      bannerUrl: null,
    },
    technicalRequirements: [
      { areaId: 'area-data', name: 'Análisis de datos', level: null },
    ],
  },
];

function actor(
  role: ActorContext['role'],
  graduateId: string | null = null,
): ActorContext {
  return {
    id: 'user-1',
    email: 'usuario@example.com',
    name: null,
    role,
    permissions: [],
    scopes: { companyIds: [], graduateId, careerIds: [] },
    credentialVersion: 1,
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
  it.each([undefined, '', '   '])(
    'preserva el listado sin depender de HU7 para texto %s',
    async (term) => {
      const jobs = repository();
      const now = new Date('2026-11-14T12:00:00.000Z');
      const search = { findIds: jest.fn() };
      jobs.listPublished.mockResolvedValue(postings);
      const useCase = new ListPublishedJobPostingsUseCase(
        jobs,
        () => now,
        search,
      );
      await useCase.execute(actor('empresa'), {
        search: term,
        page: 2,
        limit: 5,
      });
      expect(search.findIds).not.toHaveBeenCalled();
      expect(jobs.listPublished).toHaveBeenCalledWith(now);
    },
  );

  it('hidrata candidatos, preserva su orden y calcula afinidad solo con datos oficiales', async () => {
    const jobs = repository();
    const now = new Date('2026-11-14T12:00:00.000Z');
    const search = {
      findIds: jest.fn().mockResolvedValue([postings[1].id, postings[0].id]),
    };
    jobs.listPublished.mockResolvedValue(postings);
    jobs.findGraduateSkills.mockResolvedValue({
      areaIds: ['area-frontend'],
      evidence: [],
    });
    const useCase = new ListPublishedJobPostingsUseCase(
      jobs,
      () => now,
      search,
    );
    const result = await useCase.execute(actor('titulado', 'graduate-own'), {
      search: '  Empresa  ',
      page: 2,
      limit: 5,
    });
    expect(search.findIds).toHaveBeenCalledWith(
      { search: 'Empresa', page: 2, limit: 5 },
      now,
    );
    expect(jobs.listPublished).toHaveBeenCalledWith(now, [
      postings[1].id,
      postings[0].id,
    ]);
    expect(result).toEqual([
      { ...postings[1], affinityPercentage: 0 },
      { ...postings[0], affinityPercentage: 100 },
    ]);
    expect(jobs.findGraduateSkills).toHaveBeenCalledWith('graduate-own');
  });

  it('deja huecos de candidatos obsoletos sin rellenar ni exponer conteos del indice', async () => {
    const jobs = repository();
    const search = {
      findIds: jest.fn().mockResolvedValue(['missing', postings[1].id]),
    };
    jobs.listPublished.mockResolvedValue([postings[1]]);
    const result = await new ListPublishedJobPostingsUseCase(
      jobs,
      undefined,
      search,
    ).execute(actor('empresa'), { search: 'Empresa', page: 3, limit: 2 });
    expect(result).toEqual([{ ...postings[1], affinityPercentage: null }]);
    expect(search.findIds).toHaveBeenCalledTimes(1);
    expect(jobs.listPublished).toHaveBeenCalledTimes(1);
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });

  it('no muestra registros que no sean candidatos aunque un adaptador los devuelva', async () => {
    const jobs = repository();
    const search = {
      findIds: jest.fn().mockResolvedValue([postings[1].id.toUpperCase()]),
    };
    jobs.listPublished.mockResolvedValue(postings);
    const result = await new ListPublishedJobPostingsUseCase(
      jobs,
      undefined,
      search,
    ).execute(actor('empresa'), { search: 'Empresa' });
    expect(result.map(({ id }) => id)).toEqual([postings[1].id]);
  });

  it('no consulta Prisma ni el perfil cuando HU7 no encuentra candidatos', async () => {
    const jobs = repository();
    const search = { findIds: jest.fn().mockResolvedValue([]) };
    await expect(
      new ListPublishedJobPostingsUseCase(jobs, undefined, search).execute(
        actor('titulado', 'graduate-own'),
        { search: 'sin coincidencias' },
      ),
    ).resolves.toEqual([]);
    expect(jobs.listPublished).not.toHaveBeenCalled();
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });

  it('no devuelve todo el listado cuando falla la busqueda', async () => {
    const jobs = repository();
    const search = {
      findIds: jest.fn().mockRejectedValue(new Error('busqueda no disponible')),
    };
    await expect(
      new ListPublishedJobPostingsUseCase(jobs, undefined, search).execute(
        actor('empresa'),
        { search: 'Empresa' },
      ),
    ).rejects.toThrow('busqueda no disponible');
    expect(jobs.listPublished).not.toHaveBeenCalled();
  });

  it('calculates each vacancy affinity against the authenticated graduate profile', async () => {
    const jobs = repository();
    const now = new Date('2026-11-13T12:00:00.000Z');
    jobs.listPublished.mockResolvedValue(postings);
    jobs.findGraduateSkills.mockResolvedValue({
      areaIds: ['area-frontend'],
      evidence: [],
    });
    const useCase = new ListPublishedJobPostingsUseCase(jobs, () => now);

    const result = await useCase.execute(actor('titulado', 'graduate-1'));

    expect(
      result.map(({ id, affinityPercentage }) => ({ id, affinityPercentage })),
    ).toEqual([
      { id: '10000000-0000-4000-8000-000000000001', affinityPercentage: 100 },
      { id: '10000000-0000-4000-8000-000000000002', affinityPercentage: 0 },
    ]);
    expect(jobs.listPublished).toHaveBeenCalledWith(now);
    expect(jobs.findGraduateSkills).toHaveBeenCalledTimes(1);
    expect(jobs.findGraduateSkills).toHaveBeenCalledWith('graduate-1');
  });

  it('marks unavailable calculations as null and does not invent a score', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue(postings);
    jobs.findGraduateSkills.mockResolvedValue(null);
    const useCase = new ListPublishedJobPostingsUseCase(jobs);

    const result = await useCase.execute(actor('titulado', 'graduate-1'));

    expect(result.map((posting) => posting.affinityPercentage)).toEqual([
      null,
      null,
    ]);
  });

  it('does not read graduate profile data for other roles', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue(postings);
    const useCase = new ListPublishedJobPostingsUseCase(jobs);

    const result = await useCase.execute(actor('empresa'));

    expect(result.map((posting) => posting.affinityPercentage)).toEqual([
      null,
      null,
    ]);
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });

  it('returns an empty result without loading a profile when no vacancy is available', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue([]);
    const useCase = new ListPublishedJobPostingsUseCase(jobs);

    await expect(
      useCase.execute(actor('titulado', 'graduate-1')),
    ).resolves.toEqual([]);
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });

  it('propagates profile lookup failures instead of returning invented percentages', async () => {
    const jobs = repository();
    jobs.listPublished.mockResolvedValue(postings);
    jobs.findGraduateSkills.mockRejectedValue(
      new Error('profile lookup failed'),
    );
    const useCase = new ListPublishedJobPostingsUseCase(jobs);

    await expect(
      useCase.execute(actor('titulado', 'graduate-1')),
    ).rejects.toThrow('profile lookup failed');
  });
});
