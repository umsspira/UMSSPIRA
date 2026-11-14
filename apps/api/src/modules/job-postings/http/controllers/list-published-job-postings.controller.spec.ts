import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PublishedJobPostingDetail } from '../../domain/entities/published-job-posting.entity';
import { ListPublishedJobPostingsUseCase } from '../../application/use-cases/list-published-job-postings.use-case';
import { ListPublishedJobPostingsController } from './list-published-job-postings.controller';

describe('ListPublishedJobPostingsController', () => {
  it('passes the authenticated actor and presents the calculated percentage, including zero', async () => {
    const actor: ActorContext = {
      id: 'user-1',
      email: 'graduate@example.com',
      name: null,
      role: 'titulado',
      permissions: [],
      scopes: { companyIds: [], graduateId: 'graduate-1', careerIds: [] },
      credentialVersion: 1,
    };
    const posting: PublishedJobPostingDetail = {
      id: 'posting-1',
      title: 'Analista',
      modality: 'REMOTO',
      experienceLevel: 'Junior',
      technicalDescription: 'Descripción técnica',
      publishedAt: new Date('2026-11-14T00:00:00.000Z'),
      company: null,
      technicalRequirements: [],
      affinityPercentage: 0,
    };
    const useCase = { execute: jest.fn().mockResolvedValue([posting]) };
    const controller = new ListPublishedJobPostingsController(
      useCase as unknown as ListPublishedJobPostingsUseCase,
    );

    await expect(controller.list(actor)).resolves.toMatchObject({
      data: [{ id: 'posting-1', porcentajeAfinidad: 0 }],
    });
    expect(useCase.execute).toHaveBeenCalledWith(actor);
  });

  it('presents an uncalculated percentage as null instead of converting it to zero', async () => {
    const posting: PublishedJobPostingDetail = {
      id: 'posting-uncalculated',
      title: 'Sin requisitos',
      modality: null,
      experienceLevel: null,
      technicalDescription: null,
      publishedAt: null,
      company: null,
      technicalRequirements: [],
      affinityPercentage: null,
    };
    const useCase = { execute: jest.fn().mockResolvedValue([posting]) };
    const controller = new ListPublishedJobPostingsController(
      useCase as unknown as ListPublishedJobPostingsUseCase,
    );

    await expect(controller.list({} as ActorContext)).resolves.toMatchObject({
      data: [{ id: 'posting-uncalculated', porcentajeAfinidad: null }],
    });
  });
});
