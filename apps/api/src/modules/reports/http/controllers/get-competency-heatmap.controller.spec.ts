import { GetCompetencyHeatmapController } from './get-competency-heatmap.controller';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

describe('GetCompetencyHeatmapController (T3.1)', () => {
  let controller: GetCompetencyHeatmapController;
  let useCase: { execute: jest.Mock };

  const actor: ActorContext = {
    id: 'admin-1',
    email: 'admin@umss.edu.bo',
    name: 'Admin',
    role: 'administrador',
    permissions: ['reportes:read'],
    scopes: { companyIds: [], graduateId: null, careerIds: ['career-1'] },
    credentialVersion: 1,
  };

  beforeEach(() => {
    useCase = { execute: jest.fn().mockResolvedValue({ cohorts: ['2023'], cells: [] }) };
    controller = new GetCompetencyHeatmapController(useCase as never);
  });

  it('llama al caso de uso pasando actor, careerId y filtros de cohorte', async () => {
    const response = await controller.handle(actor, {
      careerId: 'career-1',
      cohort: 2023,
      semester: '1/2026',
    });

    expect(useCase.execute).toHaveBeenCalledWith(actor, 'career-1', {
      cohort: 2023,
      semester: '1/2026',
    });
    expect(response).toEqual({ data: { cohorts: ['2023'], cells: [] } });
  });

  it('llama al caso de uso sin filtros si la query viene vacía', async () => {
    await controller.handle(actor, {});

    expect(useCase.execute).toHaveBeenCalledWith(actor, undefined, undefined);
  });
});
