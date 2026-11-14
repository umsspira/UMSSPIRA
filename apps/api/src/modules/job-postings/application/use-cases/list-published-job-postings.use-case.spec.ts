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
